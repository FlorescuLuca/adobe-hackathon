import React, { useEffect, useMemo, useRef, useState } from 'react';

const brands = [
  {
    name: 'Evergreen Goods',
    short: 'EG',
    category: 'Home essentials',
    score: '98',
    claim: 'Made with 100% recycled cotton',
    source: 'Recycled Claim Standard (RCS)',
    valid: 'Verified 2 hours ago',
    tone: 'mint',
    summary:
      'Evergreen Goods’ cotton collection is made with post-consumer recycled fibers. Supplier invoices and a current RCS scope certificate support the material claim across the collection reviewed by Verity.',
    evidence: [
      ['Material traceability', 'Recycled fiber invoices matched to product batches'],
      ['Supplier certificate', 'RCS scope certificate active through 18 Jun 2027'],
      ['Independent registry', 'Certificate holder confirmed in the Textile Exchange directory'],
    ],
  },
  {
    name: 'Northstar Studio',
    short: 'NS',
    category: 'Apparel',
    score: '94',
    claim: 'Responsibly made in audited facilities',
    source: 'Fair Wear membership & facility audit',
    valid: 'Verified yesterday',
    tone: 'blue',
    summary:
      'Northstar Studio publishes factory-level information for its core collection. Verity matched the disclosed production sites with current audit records and reviewed the brand’s latest supplier list.',
    evidence: [
      ['Factory disclosure', 'Three production facilities named in the latest supplier list'],
      ['Social audit', 'Audit records reviewed for all named facilities'],
      ['Public cross-check', 'Brand membership status confirmed with Fair Wear'],
    ],
  },
  {
    name: 'TerraStep',
    short: 'TS',
    category: 'Footwear',
    score: '91',
    claim: 'Leather sourced from certified tanneries',
    source: 'Leather Working Group (LWG)',
    valid: 'Verified 5 days ago',
    tone: 'violet',
    summary:
      'TerraStep’s leather sourcing claim is supported by tannery documentation and current facility certifications. Verity checked the certificate holders and validity dates against public records.',
    evidence: [
      ['Tannery documents', 'Purchase records mapped to disclosed tannery partners'],
      ['Facility certification', 'Two tanneries hold current LWG ratings'],
      ['Validity check', 'Certificate dates confirmed against public facility records'],
    ],
  },
  {
    name: 'Kindred Supply',
    short: 'KS',
    category: 'Personal care',
    score: '96',
    claim: 'Packaging is 85% plastic-free',
    source: 'Packaging composition review',
    valid: 'Verified 1 week ago',
    tone: 'amber',
    summary:
      'Kindred Supply’s packaging statement is based on a product-weight analysis. Verity reviewed packaging specifications and supplier declarations for the items included in the published claim.',
    evidence: [
      ['Packaging breakdown', 'Material weights reconciled across 12 products'],
      ['Supplier declarations', 'Current composition statements received from vendors'],
      ['Claim scope', 'Products in the claim are clearly identified on the brand page'],
    ],
  },
];

function Mark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <path d="M17 29V16.4M17 21.2c-4.8 0-7.6-2.3-8.4-6.8 4.8 0 7.6 2.3 8.4 6.8ZM17 17.4c.5-5.4 3.5-8.3 8.7-8.7-.4 5.2-3.3 8.2-8.7 8.7Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.2 28.5h13.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="m13.1 13.1 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon({ diagonal = false }) {
  return diagonal ? (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M4 14 14 4M5 4h9v9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ) : (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3 9h11M9 4l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}

function Header({ query, setQuery, onSelectBrand, onHome, onNavigate }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef(null);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return brands.slice(0, 3);
    return brands.filter((brand) => `${brand.name} ${brand.category} ${brand.claim}`.toLowerCase().includes(normalized));
  }, [query]);

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInput.current?.focus();
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="wordmark" type="button" onClick={onHome} aria-label="Verity home">
          <Mark className="wordmark-mark" />
          <span>verity<span className="wordmark-period">.</span></span>
        </button>
        <div className={`header-search ${searchOpen ? 'is-open' : ''}`}>
          <SearchIcon />
          <input
            ref={searchInput}
            aria-label="Search verified brands"
            placeholder="Search brands"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && results[0]) onSelectBrand(results[0]);
              if (event.key === 'Escape') setSearchOpen(false);
            }}
          />
          <kbd>⌘ K</kbd>
          {searchOpen && (
            <div className="search-results">
              <p className="search-label">{query ? 'MATCHING BRANDS' : 'POPULAR BRANDS'}</p>
              {results.length ? results.map((brand) => (
                <button key={brand.name} type="button" className="search-result" onMouseDown={() => onSelectBrand(brand)}>
                  <span className={`mini-brand ${brand.tone}`}>{brand.short}</span>
                  <span><strong>{brand.name}</strong><small>{brand.category} · {brand.score} trust score</small></span>
                  <ArrowIcon diagonal />
                </button>
              )) : <p className="no-results">No verified brands match that search yet.</p>}
            </div>
          )}
        </div>
        <nav className="primary-nav" aria-label="Main navigation">
          <button type="button" onClick={() => onNavigate('how-it-works')}>How it works</button>
          <button type="button" onClick={() => onNavigate('about')}>About us</button>
          <a href="mailto:hello@verity.eco">Contact</a>
        </nav>
      </div>
    </header>
  );
}

function TreeIllustration() {
  return (
    <div className="tree-art" aria-label="A glowing tree representing transparent supply chains" role="img">
      <div className="tree-orbit orbit-one" />
      <div className="tree-orbit orbit-two" />
      <div className="tree-orbit orbit-three" />
      <div className="tree-glow" />
      <svg viewBox="0 0 520 520" className="tree-svg" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="trunk" x1="260" y1="140" x2="260" y2="480" gradientUnits="userSpaceOnUse"><stop stopColor="#E6EAD2" /><stop offset=".52" stopColor="#A9BC86" /><stop offset="1" stopColor="#607D69" /></linearGradient>
          <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#DDE8AE" /><stop offset="1" stopColor="#83996D" /></linearGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
        </defs>
        <g stroke="url(#trunk)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" filter="url(#softGlow)">
          <path d="M260 445V268m0 84-48-47m48 6 52-56m-52 13-80-84m80 43 72-85m-120 119-51-1m151-59 50-5m-102 11 7-88m-39 126-10-56m74 36 34 6" />
          <path d="M260 447c-32 0-58 7-80 19m80-19c32 0 58 7 80 19" strokeWidth="3" opacity=".65" />
        </g>
        <g fill="url(#leaf)" stroke="#BDF4D0" strokeOpacity=".72" strokeWidth="1.2">
          <ellipse cx="177" cy="166" rx="17" ry="9" transform="rotate(36 177 166)" />
          <ellipse cx="342" cy="140" rx="18" ry="9" transform="rotate(-44 342 140)" />
          <ellipse cx="180" cy="278" rx="16" ry="8" transform="rotate(1 180 278)" />
          <ellipse cx="360" cy="269" rx="17" ry="9" transform="rotate(-4 360 269)" />
          <ellipse cx="228" cy="217" rx="16" ry="8" transform="rotate(-57 228 217)" />
          <ellipse cx="301" cy="216" rx="17" ry="9" transform="rotate(51 301 216)" />
          <ellipse cx="250" cy="133" rx="15" ry="8" transform="rotate(-80 250 133)" />
          <ellipse cx="315" cy="315" rx="15" ry="8" transform="rotate(24 315 315)" />
        </g>
        <g fill="#D9F9E2">
          <circle cx="177" cy="166" r="2" /><circle cx="342" cy="140" r="2" /><circle cx="180" cy="278" r="2" /><circle cx="360" cy="269" r="2" /><circle cx="228" cy="217" r="2" /><circle cx="301" cy="216" r="2" />
        </g>
        <g fill="#D1F7DB" opacity=".9"><circle cx="133" cy="228" r="2.5"/><circle cx="385" cy="194" r="2"/><circle cx="215" cy="93" r="2"/><circle cx="329" cy="363" r="2"/><circle cx="144" cy="337" r="1.5"/><circle cx="375" cy="330" r="2"/></g>
      </svg>
      <div className="tree-caption"><span className="caption-line" /><span>Evidence, connected</span><span className="caption-line" /></div>
    </div>
  );
}

function VerificationPill({ children }) {
  return <span className="verification-pill"><span className="status-dot" />{children}</span>;
}

function BrandCard({ brand, onSelectBrand }) {
  return (
    <button className="brand-card" type="button" onClick={() => onSelectBrand(brand)}>
      <div className="brand-card-top">
        <span className={`brand-monogram ${brand.tone}`}>{brand.short}</span>
        <span className="score-badge"><span className="status-dot" />{brand.score}</span>
      </div>
      <span className="brand-category">{brand.category}</span>
      <strong className="brand-name">{brand.name}</strong>
      <span className="brand-claim">“{brand.claim}”</span>
      <span className="brand-card-bottom"><span>View evidence</span><ArrowIcon /></span>
    </button>
  );
}

function HomePage({ onSelectBrand }) {
  return (
    <main>
      <section className="hero-section">
        <div className="hero-intro">
          <div className="eyebrow"><span className="eyebrow-mark">✳</span> THE NEW STANDARD FOR CONSCIOUS COMMERCE</div>
          <h1>VERITY</h1>
          <p className="hero-description">Turn Sustainability Claims Into Verified Sales.</p>
          <div className="hero-actions">
            <button className="button button-primary" type="button" onClick={() => document.getElementById('trusted-brands')?.scrollIntoView({ behavior: 'smooth' })}>Explore verified brands <ArrowIcon /></button>
            <button className="text-link" type="button" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>How Verity works <span className="play-icon">↗</span></button>
          </div>
        </div>

        <div className="hero-stage">
          <div className="stage-kicker"><span>01 / 03</span><span className="stage-rule" />A better kind of transparency</div>
          <TreeIllustration />
          <div className="tree-note"><Mark /><span><strong>From claim to source</strong><small>Every branch leads to evidence.</small></span></div>
        </div>

        <aside className="hero-proof-card">
          <div className="proof-card-header"><span className="proof-card-label">LIVE VERIFICATION</span><span className="pulse-ring"><i /></span></div>
          <div className="proof-score"><span>98</span><small>/100</small></div>
          <p className="proof-score-label">Trust score</p>
          <div className="proof-divider" />
          <p className="proof-claim">“Made with 100% recycled cotton”</p>
          <div className="proof-brand"><span className="mini-brand mint">EG</span><span><strong>Evergreen Goods</strong><small>Verified 2 hours ago</small></span><span className="verified-check">✓</span></div>
          <button className="proof-open" type="button" onClick={() => onSelectBrand(brands[0])}>See the evidence chain <ArrowIcon /></button>
        </aside>
        <div className="hero-side-note"><span className="side-note-dot" /> DATA THAT MOVES WITH THE MOMENT</div>
      </section>

      <section className="trust-strip" aria-label="Verity verification features">
        <div className="strip-intro"><span className="strip-spark">✳</span><span>Clarity you can feel good about</span></div>
        <div className="strip-item"><span className="strip-icon">01</span><span><strong>Search the Brand:</strong><small>Look up any e-commerce platform.</small></span></div>
        <div className="strip-item"><span className="strip-icon">02</span><span><strong>Real-Time AI Analysis:</strong><small>Our engine instantly scans thousands of pages of ESG reports, public certifications, and supply chain data.</small></span></div>
        <div className="strip-item"><span className="strip-icon">03</span><span><strong>The Verdict:</strong><small>Receive a Verity Report with a clear “Trust Score”—telling you instantly if a brand is actually green, or just greenwashing.</small></span></div>
      </section>

      <section className="brands-section section-wrap" id="trusted-brands">
        <div className="section-heading">
          <div><p className="eyebrow">A MORE OPEN MARKET</p><h2>Good brands.<br /><em>Clear receipts.</em></h2></div>
          <div className="section-heading-aside"><p>Explore a growing circle of brands making their sustainability claims easier to trust.</p><span className="heading-count">04 <i>VERIFIED BRANDS</i></span></div>
        </div>
        <div className="brand-grid">{brands.map((brand) => <BrandCard key={brand.name} brand={brand} onSelectBrand={onSelectBrand} />)}</div>
        <div className="brand-section-footer"><span className="tiny-orbit">✳</span><span>Verity is growing a more transparent way to shop.</span><a href="mailto:hello@verity.eco">Partner with us <ArrowIcon /></a></div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="how-inner section-wrap">
          <div className="how-heading"><p className="eyebrow">THE VERITY METHOD</p><h2>Less guesswork.<br /><em>More grounded.</em></h2><p>We make the invisible parts of a product’s journey easier to understand, without slowing down the moment you shop.</p></div>
          <div className="method-steps">
            <article className="method-step"><span className="step-number">01</span><div className="step-icon doc-icon"><span /> <span /> <span /></div><h3>We read the fine print</h3><p>AI reviews reports, invoices, and supplier certificates to find the details behind broad claims.</p><span className="step-connector" /></article>
            <article className="method-step"><span className="step-number">02</span><div className="step-icon cross-icon">⌕</div><h3>We check the sources</h3><p>Supplier records are cross-referenced with public registries and current certification data.</p><span className="step-connector" /></article>
            <article className="method-step"><span className="step-number">03</span><div className="step-icon leaf-icon"><Mark /></div><h3>You see what’s verified</h3><p>A simple evidence chain gives every claim context, right when it matters to you.</p></article>
          </div>
        </div>
      </section>

      <section className="about-section section-wrap" id="about">
        <div className="about-symbol"><Mark /><span className="about-orbit" /><span className="about-orbit orbit-b" /></div>
        <div className="about-copy"><p className="eyebrow">A LITTLE ABOUT US</p><h2>Good decisions need<br /><em>good information.</em></h2><p>Verity exists to make sustainability less of a leap of faith. We connect the words on a product page to the documents, standards, and suppliers behind them—so shoppers and brands can meet in a place built on trust.</p><a href="mailto:hello@verity.eco" className="about-link">Get to know Verity <ArrowIcon /></a></div>
        <div className="about-stat"><span className="stat-star">✳</span><strong>Make every<br />claim count.</strong><small>Transparency for a world that’s ready to ask better questions.</small></div>
      </section>

      <footer className="site-footer"><div className="footer-brand"><Mark /><span>verity<span className="wordmark-period">.</span></span></div><p>Proof behind every promise.</p><div className="footer-right"><a href="mailto:hello@verity.eco">Contact</a><span>© 2026 Verity</span><span className="footer-location">Built for better choices <span>✳</span></span></div></footer>
    </main>
  );
}

function BrandProfile({ brand, onBack }) {
  return (
    <main className="profile-page">
      <div className="profile-top section-wrap">
        <button type="button" className="back-link" onClick={onBack}><span>←</span> Back to Verity</button>
        <span className="profile-generated"><span className="status-dot" /> VERITY AI SUMMARY</span>
      </div>
      <section className="profile-hero section-wrap">
        <span className={`profile-monogram ${brand.tone}`}>{brand.short}</span>
        <p className="eyebrow">BRAND EVIDENCE PROFILE</p>
        <h1>{brand.name}</h1>
        <p className="profile-category">{brand.category} <span>·</span> Independent evidence overview</p>
        <VerificationPill>{brand.valid}</VerificationPill>
        <div className="profile-links"><a href="#evidence">View evidence chain <ArrowIcon /></a><a href="https://example.com" target="_blank" rel="noreferrer">Visit brand <ArrowIcon diagonal /></a></div>
      </section>
      <div className="profile-content section-wrap">
        <section className="profile-summary panel">
          <div className="panel-heading"><div><p className="eyebrow">AI-GENERATED SUMMARY</p><h2>What the evidence says</h2></div><span className="summary-spark">✳</span></div>
          <p className="summary-text">{brand.summary}</p>
          <div className="claim-box"><span className="claim-icon">“</span><div><small>THE BRAND CLAIM</small><strong>{brand.claim}</strong><small className="claim-source">Evidence source · {brand.source}</small></div><span className="claim-status"><span className="status-dot" />Supported</span></div>
          <p className="summary-disclaimer">This summary reflects the documents and public records reviewed by Verity at the time shown. It is designed to make the evidence easier to understand.</p>
        </section>
        <aside className="profile-score panel">
          <p className="eyebrow">VERITY TRUST SCORE</p>
          <div className="score-dial" style={{ '--score': `${brand.score}%` }}><div><strong>{brand.score}</strong><small> / 100</small></div></div>
          <p className="score-copy">Strong evidence coverage</p>
          <span className="score-timestamp"><span className="status-dot" /> Updated recently</span>
        </aside>
        <section className="evidence-section" id="evidence">
          <div className="evidence-heading"><div><p className="eyebrow">FOLLOW THE PROOF</p><h2>Evidence chain</h2></div><span>3 SOURCES REVIEWED</span></div>
          <div className="evidence-list">{brand.evidence.map(([title, detail], index) => <article className="evidence-row" key={title}><span className="evidence-index">0{index + 1}</span><span className="evidence-check">✓</span><div><h3>{title}</h3><p>{detail}</p></div><span className="evidence-valid">Verified</span></article>)}</div>
        </section>
        <div className="profile-note"><span>✳</span><p><strong>How to read this profile</strong><br />Verity’s score reflects the availability, quality, and freshness of evidence. It isn’t a judgment of a brand’s overall impact.</p></div>
      </div>
      <footer className="profile-footer section-wrap"><span>verity<span className="wordmark-period">.</span></span><span>Evidence for a more informed choice.</span><button type="button" onClick={onBack}>Explore more brands <ArrowIcon /></button></footer>
    </main>
  );
}

export default function App() {
  const [query, setQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);

  function showHome() {
    setSelectedBrand(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigateTo(id) {
    if (selectedBrand) {
      setSelectedBrand(null);
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 60);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function openBrand(brand) {
    setSelectedBrand(brand);
    setQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="app-shell">
      <Header query={query} setQuery={setQuery} onSelectBrand={openBrand} onHome={showHome} onNavigate={navigateTo} />
      {selectedBrand ? <BrandProfile brand={selectedBrand} onBack={showHome} /> : <HomePage onSelectBrand={openBrand} />}
    </div>
  );
}
