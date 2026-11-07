import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from './api.js';

function messageFor(error) {
  if (error.status === 401) return 'Your session expired. Sign out and sign in again.';
  return error.message || 'Something went wrong. Please try again.';
}

function AssessmentClaims({ claims, facts = [], documents = [] }) {
  const factById = new Map(facts.map((fact) => [fact.id, fact]));
  const documentById = new Map(documents.map((document) => [document.id, document]));
  return claims?.map((claim) => (
    <article className="assessment-result" key={claim.id}>
      <div className="assessment-result-title">
        <h3>{claim.text}</h3>
        <span className={`assessment-status status-${claim.status}`}>{claim.status.replaceAll('_', ' ')}</span>
      </div>
      <p>{claim.explanation}</p>
      {claim.evidence?.length > 0 && <ul>{claim.evidence.map((item, index) => {
        const fact = factById.get(item.fact_id);
        const source = fact ? documentById.get(fact.document_id)?.filename : null;
        return <li key={`${item.fact_id}-${index}`}>{source ? <><strong>{source}</strong> · </> : null}p. {item.page}: “{item.quote}”</li>;
      })}</ul>}
      {claim.evidence_limits && <small>Evidence limits: {claim.evidence_limits}</small>}
      {claim.suggested_rewrite && <p><strong>Suggested wording:</strong> {claim.suggested_rewrite}</p>}
    </article>
  ));
}

function resultLabel(item) {
  if (item.status === 'no_claims') return 'No claims added';
  if (item.status === 'no_documents') return 'No evidence available';
  if (item.status === 'error') return 'Assessment failed';
  return `${item.result.claims.length} ${item.result.claims.length === 1 ? 'claim assessed' : 'claims assessed'}`;
}

function documentLabel(document) {
  return document.processing_status === 'pending' ? 'ready for assessment' : document.processing_status.replaceAll('_', ' ');
}

export default function BusinessDashboard({ session, onSignOut }) {
  const [company, setCompany] = useState(null);
  const [needsCompany, setNeedsCompany] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [companyDocuments, setCompanyDocuments] = useState([]);
  const [claims, setClaims] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [portfolioResults, setPortfolioResults] = useState([]);
  const [portfolioHasRun, setPortfolioHasRun] = useState(false);
  const [portfolioProgress, setPortfolioProgress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [claimText, setClaimText] = useState('');
  const [file, setFile] = useState(null);
  const [companyFile, setCompanyFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedProduct = products.find((product) => product.id === selectedId) || null;

  const loadProducts = useCallback(async () => {
    const rows = await apiRequest('/products', { session });
    setProducts(rows);
    setSelectedId((current) => rows.some((row) => row.id === current) ? current : rows[0]?.id || '');
  }, [session]);

  const loadCompanyDocuments = useCallback(async () => {
    const rows = await apiRequest('/companies/me/documents', { session });
    setCompanyDocuments(rows);
    return rows;
  }, [session]);

  useEffect(() => {
    let alive = true;
    setError('');
    apiRequest('/companies/me', { session })
      .then(async (row) => {
        if (!alive) return;
        setCompany(row);
        setNeedsCompany(false);
        const [productRows, reportRows] = await Promise.all([
          apiRequest('/products', { session }),
          apiRequest('/companies/me/documents', { session }),
        ]);
        if (alive) {
          setProducts(productRows);
          setSelectedId((current) => productRows.some((item) => item.id === current) ? current : productRows[0]?.id || '');
          setCompanyDocuments(reportRows);
        }
      })
      .catch((reason) => {
        if (!alive) return;
        if (reason.status === 404) setNeedsCompany(true);
        else setError(messageFor(reason));
      });
    return () => { alive = false; };
  }, [session]);

  useEffect(() => {
    if (!selectedId) {
      setDocuments([]);
      setClaims([]);
      setAssessment(null);
      return;
    }
    let alive = true;
    setError('');
    Promise.all([
      apiRequest(`/products/${selectedId}/documents`, { session }),
      apiRequest(`/products/${selectedId}/claims`, { session }),
    ]).then(([docs, productClaims]) => {
      if (!alive) return;
      setDocuments(docs);
      setClaims(productClaims);
      setAssessment(null);
    }).catch((reason) => { if (alive) setError(messageFor(reason)); });
    return () => { alive = false; };
  }, [selectedId, session]);

  async function run(action) {
    setBusy(true);
    setError('');
    try { await action(); }
    catch (reason) { setError(messageFor(reason)); }
    finally { setBusy(false); }
  }

  function createCompany(event) {
    event.preventDefault();
    return run(async () => {
      const row = await apiRequest('/companies', { session, method: 'POST', body: JSON.stringify({ name: companyName }) });
      setCompany(row);
      setNeedsCompany(false);
      setCompanyName('');
      setProducts([]);
      setCompanyDocuments([]);
    });
  }

  function createProduct(event) {
    event.preventDefault();
    return run(async () => {
      const row = await apiRequest('/products', { session, method: 'POST', body: JSON.stringify({ name: productName, description: productDescription || null }) });
      setProductName('');
      setProductDescription('');
      await loadProducts();
      setSelectedId(row.id);
      setPortfolioHasRun(false);
      setPortfolioResults([]);
    });
  }

  function addClaim(event) {
    event.preventDefault();
    if (!selectedId) return;
    return run(async () => {
      await apiRequest(`/products/${selectedId}/claims`, { session, method: 'POST', body: JSON.stringify({ text: claimText }) });
      setClaimText('');
      setClaims(await apiRequest(`/products/${selectedId}/claims`, { session }));
      setAssessment(null);
      setPortfolioHasRun(false);
      setPortfolioResults([]);
    });
  }

  function uploadCompanyDocument(event) {
    event.preventDefault();
    if (!companyFile) return;
    const form = event.currentTarget;
    return run(async () => {
      const body = new FormData();
      body.append('file', companyFile);
      await apiRequest('/companies/me/documents', { session, method: 'POST', body });
      setCompanyFile(null);
      form.reset();
      await loadCompanyDocuments();
      setPortfolioHasRun(false);
      setPortfolioResults([]);
      setAssessment(null);
    });
  }

  function uploadProductDocument(event) {
    event.preventDefault();
    if (!selectedId || !file) return;
    const form = event.currentTarget;
    return run(async () => {
      const body = new FormData();
      body.append('file', file);
      await apiRequest(`/products/${selectedId}/documents`, { session, method: 'POST', body });
      setFile(null);
      form.reset();
      setDocuments(await apiRequest(`/products/${selectedId}/documents`, { session }));
      setAssessment(null);
      setPortfolioHasRun(false);
      setPortfolioResults([]);
    });
  }

  function deleteCompanyDocument(document) {
    if (!window.confirm(`Delete the company report “${document.filename}”? It will no longer be used in portfolio assessments.`)) return;
    return run(async () => {
      await apiRequest(`/companies/me/documents/${document.id}`, { session, method: 'DELETE' });
      await loadCompanyDocuments();
      setPortfolioHasRun(false);
      setPortfolioResults([]);
      setPortfolioProgress('');
      setAssessment(null);
    });
  }

  function deleteProductDocument(document) {
    if (!selectedId || !window.confirm(`Delete “${document.filename}” from ${selectedProduct.name}?`)) return;
    return run(async () => {
      await apiRequest(`/products/${selectedId}/documents/${document.id}`, { session, method: 'DELETE' });
      setDocuments(await apiRequest(`/products/${selectedId}/documents`, { session }));
      setAssessment(null);
      setPortfolioHasRun(false);
      setPortfolioResults([]);
      setPortfolioProgress('');
    });
  }

  function deleteClaim(claim) {
    if (!selectedId || !window.confirm(`Delete this claim from ${selectedProduct.name}?`)) return;
    return run(async () => {
      await apiRequest(`/products/${selectedId}/claims/${claim.id}`, { session, method: 'DELETE' });
      setClaims(await apiRequest(`/products/${selectedId}/claims`, { session }));
      setAssessment(null);
      setPortfolioHasRun(false);
      setPortfolioResults([]);
      setPortfolioProgress('');
    });
  }

  function deleteProduct() {
    if (!selectedProduct || !window.confirm(`Delete “${selectedProduct.name}” and its claims, documents, and assessments?`)) return;
    return run(async () => {
      await apiRequest(`/products/${selectedProduct.id}`, { session, method: 'DELETE' });
      const rows = await apiRequest('/products', { session });
      setProducts(rows);
      setSelectedId(rows[0]?.id || '');
      setDocuments([]);
      setClaims([]);
      setAssessment(null);
      setPortfolioHasRun(false);
      setPortfolioResults([]);
      setPortfolioProgress('');
    });
  }

  function assessProduct() {
    if (!selectedId || (!documents.length && !companyDocuments.length) || !claims.length) return;
    return run(async () => {
      const documentIds = [...new Set([...companyDocuments, ...documents].map((doc) => doc.id))];
      const result = await apiRequest(`/products/${selectedId}/assessments`, {
        session,
        method: 'POST',
        body: JSON.stringify({ document_ids: documentIds, claim_ids: claims.map((claim) => claim.id) }),
      });
      setAssessment(result.result);
    });
  }

  function assessPortfolio() {
    if (!products.length || !companyDocuments.length) return;
    return run(async () => {
      setPortfolioHasRun(true);
      setPortfolioResults([]);
      setPortfolioProgress(`Preparing assessment for ${products.length} products…`);
      const sharedDocumentIds = companyDocuments.map((doc) => doc.id);
      const nextResults = [];

      for (const [index, product] of products.entries()) {
        let item;
        try {
          setPortfolioProgress(`Loading claims and product evidence (${index + 1} of ${products.length}): ${product.name}`);
          const [productClaims, productDocuments] = await Promise.all([
            apiRequest(`/products/${product.id}/claims`, { session }),
            apiRequest(`/products/${product.id}/documents`, { session }),
          ]);
          if (!productClaims.length) {
            item = { product, status: 'no_claims' };
          } else {
            const documentIds = [...new Set([...sharedDocumentIds, ...productDocuments.map((doc) => doc.id)])];
            setPortfolioProgress(`Assessing ${product.name} (${index + 1} of ${products.length}; ${productClaims.length} claims)…`);
            const result = await apiRequest(`/products/${product.id}/assessments`, {
              session,
              method: 'POST',
              body: JSON.stringify({ document_ids: documentIds, claim_ids: productClaims.map((claim) => claim.id) }),
            });
            item = { product, status: 'assessed', result: result.result, documents: [...companyDocuments, ...productDocuments] };
          }
        } catch (reason) {
          item = { product, status: 'error', error: messageFor(reason) };
        }
        nextResults.push(item);
        setPortfolioResults([...nextResults]);
        setPortfolioProgress(`Finished ${index + 1} of ${products.length} products.`);
      }
      setPortfolioProgress('Portfolio assessment complete.');
    });
  }

  function togglePublished() {
    if (!selectedProduct) return;
    return run(async () => {
      const updated = await apiRequest(`/products/${selectedProduct.id}`, {
        session,
        method: 'PATCH',
        body: JSON.stringify({ is_published: !selectedProduct.is_published }),
      });
      setProducts((rows) => rows.map((row) => row.id === updated.id ? updated : row));
    });
  }

  return (
    <main className="dashboard-page section-wrap">
      <div className="dashboard-heading">
        <div><p className="eyebrow">VERITY FOR COMPANIES</p><h1>Evidence workspace</h1><p>Review company-wide sustainability reporting alongside claims across your product range.</p></div>
        <div className="dashboard-user"><span>{session.user?.email}</span><button type="button" onClick={onSignOut}>Sign out</button></div>
      </div>
      {error && <p className="api-alert" role="alert">{error}</p>}
      {needsCompany ? (
        <section className="dashboard-panel dashboard-narrow"><p className="eyebrow">FIRST STEP</p><h2>Create your company</h2><form className="dashboard-form" onSubmit={createCompany}><label htmlFor="company-name">Company name</label><input id="company-name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required maxLength={160} /><button className="dashboard-primary" disabled={busy}>{busy ? 'Saving…' : 'Create company'}</button></form></section>
      ) : company && (
        <>
          <div className="dashboard-overview"><span>COMPANY</span><strong>{company.name}</strong><span>{products.length} {products.length === 1 ? 'product' : 'products'}</span></div>

          <section className="dashboard-panel company-evidence-panel">
            <div className="dashboard-section-heading">
              <div><p className="eyebrow">COMPANY-WIDE EVIDENCE</p><h2>Sustainability reports</h2></div>
              <span className="company-evidence-count">{companyDocuments.length} {companyDocuments.length === 1 ? 'report' : 'reports'}</span>
            </div>
            <p className="dashboard-panel-copy">Upload a company report once. VERITY will consider it for claims on every product, while keeping each result tied to that product’s actual coverage.</p>
            <form className="dashboard-form company-upload-form" onSubmit={uploadCompanyDocument}>
              <label htmlFor="company-report-pdf">Add a company sustainability report (PDF)</label>
              <div className="company-upload-row"><input id="company-report-pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => setCompanyFile(event.target.files?.[0] || null)} required /><button className="dashboard-primary" disabled={busy || !companyFile}>{busy ? 'Uploading…' : 'Upload report'}</button></div>
            </form>
            {companyDocuments.length ? <ul className="dashboard-list company-evidence-list">{companyDocuments.map((doc) => <li key={doc.id}><strong>{doc.filename}</strong><span>{documentLabel(doc)}</span><button type="button" className="dashboard-danger" onClick={() => deleteCompanyDocument(doc)} disabled={busy} aria-label={`Remove report ${doc.filename}`}>Remove</button></li>)}</ul> : <p className="dashboard-empty">No company-wide report uploaded yet. Product-specific documents remain available as additional evidence.</p>}
          </section>

          <section className="dashboard-panel portfolio-panel">
            <div className="dashboard-assessment">
              <div><p className="eyebrow">PORTFOLIO REVIEW</p><h2>Assess claims across your product range</h2><p>Each product’s claims are assessed separately using the company report and any documents attached to that product. A company-level report is not assumed to cover every product.</p></div>
              <button className="dashboard-primary" type="button" onClick={assessPortfolio} disabled={busy || !products.length || !companyDocuments.length}>{busy ? 'Assessing portfolio…' : 'Run portfolio assessment'}</button>
            </div>
            {!companyDocuments.length && <p className="portfolio-hint">Upload a company sustainability report to start a portfolio assessment.</p>}
            {portfolioHasRun && <p className="portfolio-progress" role="status" aria-live="polite">{portfolioProgress}</p>}
            {portfolioHasRun && <div className="portfolio-results">
              <div className="portfolio-results-heading"><p className="eyebrow">PRODUCT-BY-PRODUCT RESULTS</p><span>{portfolioResults.length} / {products.length} reviewed</span></div>
              {portfolioResults.map((item) => (
                <article className="portfolio-product-result" key={item.product.id}>
                  <div className="portfolio-product-heading"><h3>{item.product.name}</h3><span className="portfolio-product-meta">{resultLabel(item)}</span></div>
                  {item.status === 'no_claims' && <p className="dashboard-empty">Add marketing claims for this product to include it in the next assessment.</p>}
                  {item.status === 'error' && <p className="portfolio-error">{item.error}</p>}
                  {item.status === 'assessed' && <div className="assessment-results"><AssessmentClaims claims={item.result.claims} facts={item.result.facts} documents={item.documents} /></div>}
                </article>
              ))}
            </div>}
          </section>

          <section className="dashboard-panel product-catalog-panel">
            <div className="dashboard-section-heading"><div><p className="eyebrow">PRODUCT CATALOG</p><h2>Your products</h2></div>
              {products.length > 0 && <select aria-label="Select product" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>}
            </div>
            <form className="dashboard-form dashboard-product-form" onSubmit={createProduct}>
              <label htmlFor="product-name">Add product</label><div className="dashboard-inline"><input id="product-name" placeholder="Product name" value={productName} onChange={(event) => setProductName(event.target.value)} required maxLength={200} /><input aria-label="Product description" placeholder="Short description (optional)" value={productDescription} onChange={(event) => setProductDescription(event.target.value)} maxLength={4000} /><button className="dashboard-primary" disabled={busy}>Add product</button></div>
            </form>
          </section>
          {selectedProduct ? (
            <section className="dashboard-workspace">
              <div className="dashboard-panel dashboard-product-header"><div><p className="eyebrow">SELECTED PRODUCT</p><h2>{selectedProduct.name}</h2><code>{selectedProduct.slug}</code></div><div className="dashboard-actions"><button type="button" className="dashboard-secondary" onClick={togglePublished} disabled={busy}>{selectedProduct.is_published ? 'Unpublish' : 'Publish page'}</button>{selectedProduct.is_published && <a className="dashboard-secondary" href={`/p/${selectedProduct.slug}`} target="_blank" rel="noreferrer">View public page ↗</a>}<button type="button" className="dashboard-danger" onClick={deleteProduct} disabled={busy}>Delete product</button></div></div>
              <div className="dashboard-columns">
                <section className="dashboard-panel"><p className="eyebrow">PRODUCT-SPECIFIC EVIDENCE</p><h2>Product documents</h2><p className="dashboard-panel-copy">Use product documents for evidence that applies only to {selectedProduct.name}. Company reports are included automatically.</p><form className="dashboard-form" onSubmit={uploadProductDocument}><label htmlFor="product-pdf">Upload a PDF</label><input id="product-pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} required /><button className="dashboard-primary" disabled={busy || !file}>{busy ? 'Working…' : 'Upload document'}</button></form><ul className="dashboard-list">{documents.map((doc) => <li key={doc.id}><strong>{doc.filename}</strong><span>{documentLabel(doc)}</span><button type="button" className="dashboard-danger" onClick={() => deleteProductDocument(doc)} disabled={busy} aria-label={`Remove product document ${doc.filename}`}>Remove</button></li>)}</ul>{!documents.length && <p className="dashboard-empty">No product-specific documents uploaded.</p>}</section>
                <section className="dashboard-panel"><p className="eyebrow">MARKETING CLAIMS</p><h2>Claims to assess</h2><form className="dashboard-form" onSubmit={addClaim}><label htmlFor="claim-text">Add a claim for {selectedProduct.name}</label><textarea id="claim-text" value={claimText} onChange={(event) => setClaimText(event.target.value)} maxLength={2000} rows={3} required placeholder="Example: Packaging is 100% recyclable" /><button className="dashboard-primary" disabled={busy}>Add claim</button></form><ul className="dashboard-list">{claims.map((claim) => <li key={claim.id}><strong>{claim.text}</strong><button type="button" className="dashboard-danger" onClick={() => deleteClaim(claim)} disabled={busy} aria-label={`Remove claim ${claim.text}`}>Remove</button></li>)}</ul>{!claims.length && <p className="dashboard-empty">No claims added yet.</p>}</section>
              </div>
              <div className="dashboard-panel dashboard-assessment"><div><p className="eyebrow">SINGLE PRODUCT REVIEW</p><h2>Compare this product’s claims</h2><p>Company-wide reports and this product’s documents are used together. Results are based on company-provided evidence and are not independent certifications.</p></div><button className="dashboard-primary" type="button" onClick={assessProduct} disabled={busy || (!documents.length && !companyDocuments.length) || !claims.length}>{busy ? 'Assessing…' : 'Assess this product'}</button></div>
              {assessment && <section className="dashboard-panel assessment-results"><p className="eyebrow">ASSESSMENT RESULTS · {selectedProduct.name}</p><AssessmentClaims claims={assessment.claims} facts={assessment.facts} documents={[...companyDocuments, ...documents]} /></section>}
            </section>
          ) : <p className="dashboard-empty">Add your first product above to get started.</p>}
        </>
      )}
    </main>
  );
}
