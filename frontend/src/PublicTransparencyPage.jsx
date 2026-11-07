import React, { useEffect, useState } from 'react';
import { apiRequest } from './api.js';

export default function PublicTransparencyPage({ slug, onHome }) {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    apiRequest(`/public/products/${encodeURIComponent(slug)}`)
      .then((result) => { if (alive) setPayload(result); })
      .catch((reason) => { if (alive) setError(reason.message || 'Could not load this product.'); });
    return () => { alive = false; };
  }, [slug]);

  if (error) return <main className="public-product-page section-wrap"><button className="back-link" type="button" onClick={onHome}>← Back to Verity</button><section className="dashboard-panel"><p className="eyebrow">PRODUCT NOT AVAILABLE</p><h1>We couldn’t find this transparency page.</h1><p>{error}</p></section></main>;
  if (!payload) return <main className="public-product-page section-wrap"><p className="eyebrow">LOADING PRODUCT EVIDENCE…</p></main>;

  const result = payload.assessment?.result_json;
  return (
    <main className="public-product-page section-wrap">
      <button className="back-link" type="button" onClick={onHome}>← Back to Verity</button>
      <header className="public-product-heading"><p className="eyebrow">PUBLIC PRODUCT TRANSPARENCY</p><h1>{payload.product.name}</h1>{payload.product.description && <p>{payload.product.description}</p>}<code>{payload.product.slug}</code></header>
      <div className="public-assessment-notice">{payload.assessment_notice}</div>
      {!result ? <section className="dashboard-panel"><h2>No assessment published yet</h2><p>The company has published this product page, but no assessment is available.</p></section> : (
        <>
          <section className="dashboard-panel public-claims"><div className="dashboard-section-heading"><div><p className="eyebrow">CLAIM REVIEW</p><h2>What the evidence supports</h2></div><span>Updated {new Date(payload.assessment.created_at).toLocaleDateString()}</span></div>
            {result.claims.map((claim) => <article className="assessment-result" key={claim.id}><div className="assessment-result-title"><h3>{claim.text}</h3><span className={`assessment-status status-${claim.status}`}>{claim.status.replaceAll('_', ' ')}</span></div><p>{claim.explanation}</p>{claim.evidence?.length > 0 && <ul>{claim.evidence.map((item, index) => <li key={`${item.fact_id}-${index}`}>Page {item.page}: “{item.quote}”</li>)}</ul>}{claim.evidence_limits && <small>Evidence limits: {claim.evidence_limits}</small>}{claim.suggested_rewrite && <p><strong>More precise wording:</strong> {claim.suggested_rewrite}</p>}</article>)}
          </section>
          <section className="dashboard-panel public-facts"><p className="eyebrow">EXTRACTED EVIDENCE</p><h2>Facts from the documents</h2>{result.facts.map((fact) => <article key={fact.id}><p>{fact.text}</p><small>Document {fact.document_id} · page {fact.page}</small>{fact.quote && <blockquote>“{fact.quote}”</blockquote>}</article>)}</section>
        </>
      )}
    </main>
  );
}
