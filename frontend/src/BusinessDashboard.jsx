import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from './api.js';

function messageFor(error) {
  if (error.status === 401) return 'Your session expired. Sign out and sign in again.';
  return error.message || 'Something went wrong. Please try again.';
}

export default function BusinessDashboard({ session, onSignOut }) {
  const [company, setCompany] = useState(null);
  const [needsCompany, setNeedsCompany] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [claims, setClaims] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [claimText, setClaimText] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedProduct = products.find((product) => product.id === selectedId) || null;

  const loadProducts = useCallback(async () => {
    const rows = await apiRequest('/products', { session });
    setProducts(rows);
    setSelectedId((current) => rows.some((row) => row.id === current) ? current : rows[0]?.id || '');
  }, [session]);

  useEffect(() => {
    let alive = true;
    setError('');
    apiRequest('/companies/me', { session })
      .then(async (row) => {
        if (!alive) return;
        setCompany(row);
        setNeedsCompany(false);
        const rows = await apiRequest('/products', { session });
        if (alive) {
          setProducts(rows);
          setSelectedId((current) => rows.some((item) => item.id === current) ? current : rows[0]?.id || '');
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
      await loadProducts();
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
    });
  }

  function uploadDocument(event) {
    event.preventDefault();
    if (!selectedId || !file) return;
    return run(async () => {
      const body = new FormData();
      body.append('file', file);
      await apiRequest(`/products/${selectedId}/documents`, { session, method: 'POST', body });
      setFile(null);
      event.currentTarget.reset();
      setDocuments(await apiRequest(`/products/${selectedId}/documents`, { session }));
      setAssessment(null);
    });
  }

  function assessProduct() {
    if (!selectedId || !documents.length || !claims.length) return;
    return run(async () => {
      const result = await apiRequest(`/products/${selectedId}/assessments`, {
        session,
        method: 'POST',
        body: JSON.stringify({ document_ids: documents.map((doc) => doc.id), claim_ids: claims.map((claim) => claim.id) }),
      });
      setAssessment(result.result);
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
        <div><p className="eyebrow">VERITY FOR COMPANIES</p><h1>Evidence workspace</h1><p>Manage products, documents, and the claims you want to assess.</p></div>
        <div className="dashboard-user"><span>{session.user?.email}</span><button type="button" onClick={onSignOut}>Sign out</button></div>
      </div>
      {error && <p className="api-alert" role="alert">{error}</p>}
      {needsCompany ? (
        <section className="dashboard-panel dashboard-narrow"><p className="eyebrow">FIRST STEP</p><h2>Create your company</h2><form className="dashboard-form" onSubmit={createCompany}><label htmlFor="company-name">Company name</label><input id="company-name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required maxLength={160} /><button className="dashboard-primary" disabled={busy}>{busy ? 'Saving…' : 'Create company'}</button></form></section>
      ) : company && (
        <>
          <div className="dashboard-overview"><span>COMPANY</span><strong>{company.name}</strong><span>{products.length} {products.length === 1 ? 'product' : 'products'}</span></div>
          <section className="dashboard-panel">
            <div className="dashboard-section-heading"><div><p className="eyebrow">PRODUCTS</p><h2>Your products</h2></div>
              {products.length > 0 && <select aria-label="Select product" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>}
            </div>
            <form className="dashboard-form dashboard-product-form" onSubmit={createProduct}>
              <label htmlFor="product-name">Add product</label><div className="dashboard-inline"><input id="product-name" placeholder="Product name" value={productName} onChange={(event) => setProductName(event.target.value)} required maxLength={200} /><input aria-label="Product description" placeholder="Short description (optional)" value={productDescription} onChange={(event) => setProductDescription(event.target.value)} maxLength={4000} /><button className="dashboard-primary" disabled={busy}>Add product</button></div>
            </form>
          </section>
          {selectedProduct ? (
            <section className="dashboard-workspace">
              <div className="dashboard-panel dashboard-product-header"><div><p className="eyebrow">SELECTED PRODUCT</p><h2>{selectedProduct.name}</h2><code>{selectedProduct.slug}</code></div><div className="dashboard-actions"><button type="button" className="dashboard-secondary" onClick={togglePublished} disabled={busy}>{selectedProduct.is_published ? 'Unpublish' : 'Publish page'}</button>{selectedProduct.is_published && <a className="dashboard-secondary" href={`/p/${selectedProduct.slug}`} target="_blank" rel="noreferrer">View public page ↗</a>}</div></div>
              <div className="dashboard-columns">
                <section className="dashboard-panel"><p className="eyebrow">DOCUMENTS</p><h2>Source files</h2><form className="dashboard-form" onSubmit={uploadDocument}><label htmlFor="product-pdf">Upload a PDF</label><input id="product-pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} required /><button className="dashboard-primary" disabled={busy || !file}>{busy ? 'Working…' : 'Upload document'}</button></form><ul className="dashboard-list">{documents.map((doc) => <li key={doc.id}><strong>{doc.filename}</strong><span>{doc.processing_status}</span></li>)}</ul>{!documents.length && <p className="dashboard-empty">No documents uploaded yet.</p>}</section>
                <section className="dashboard-panel"><p className="eyebrow">MARKETING CLAIMS</p><h2>Claims to assess</h2><form className="dashboard-form" onSubmit={addClaim}><label htmlFor="claim-text">Add a claim</label><textarea id="claim-text" value={claimText} onChange={(event) => setClaimText(event.target.value)} maxLength={2000} rows={3} required placeholder="Example: Packaging is 100% recyclable" /><button className="dashboard-primary" disabled={busy}>Add claim</button></form><ul className="dashboard-list">{claims.map((claim) => <li key={claim.id}><strong>{claim.text}</strong></li>)}</ul>{!claims.length && <p className="dashboard-empty">No claims added yet.</p>}</section>
              </div>
              <div className="dashboard-panel dashboard-assessment"><div><p className="eyebrow">AI ASSESSMENT</p><h2>Compare claims with evidence</h2><p>Results reflect company-provided documents and are not independent certifications.</p></div><button className="dashboard-primary" type="button" onClick={assessProduct} disabled={busy || !documents.length || !claims.length}>{busy ? 'Assessing…' : 'Run assessment'}</button></div>
              {assessment && <section className="dashboard-panel assessment-results"><p className="eyebrow">ASSESSMENT RESULTS</p>{assessment.claims.map((claim) => <article className="assessment-result" key={claim.id}><div className="assessment-result-title"><h3>{claim.text}</h3><span className={`assessment-status status-${claim.status}`}>{claim.status.replaceAll('_', ' ')}</span></div><p>{claim.explanation}</p>{claim.evidence?.length > 0 && <ul>{claim.evidence.map((item, index) => <li key={`${item.fact_id}-${index}`}>p. {item.page}: “{item.quote}”</li>)}</ul>}{claim.evidence_limits && <small>Evidence limits: {claim.evidence_limits}</small>}{claim.suggested_rewrite && <p><strong>Suggested wording:</strong> {claim.suggested_rewrite}</p>}</article>)}</section>}
            </section>
          ) : <p className="dashboard-empty">Add your first product above to get started.</p>}
        </>
      )}
    </main>
  );
}
