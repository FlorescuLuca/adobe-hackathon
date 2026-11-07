import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react';

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

function Header({ query, setQuery, onSelectBrand, onHome, onNavigate, onCompanyLogin }) {
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
            placeholder="Search a brand or claim"
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
          <button type="button" onClick={() => onNavigate('trusted-brands')}>Brands</button>
          <button type="button" onClick={() => onNavigate('about')}>About us</button>
          <button className="company-login-nav" type="button" onClick={onCompanyLogin}>
            <span className="company-login-full">Login</span>
            <span className="company-login-short">Log in</span>
          </button>
          <a href="mailto:hello@verity.eco">Contact</a>
        </nav>
      </div>
    </header>
  );
}

function BranchArtwork() {
  const branchRef = useRef(null);

  useEffect(() => {
    let currentDrift = 0;
    let targetDrift = 0;
    let frame = 0;

    function animateText() {
      const movingUp = targetDrift < currentDrift;
      currentDrift += (targetDrift - currentDrift) * (movingUp ? 0.55 : 0.25);
      const intro = branchRef.current?.closest('.hero-section')?.querySelector('.hero-intro');
      intro?.style.setProperty('--text-scroll-drift', `${currentDrift.toFixed(1)}px`);
      if (Math.abs(targetDrift - currentDrift) > 0.2) {
        frame = window.requestAnimationFrame(animateText);
      } else {
        currentDrift = targetDrift;
        intro?.style.setProperty('--text-scroll-drift', `${currentDrift.toFixed(1)}px`);
        frame = 0;
      }
    }

    function updateDrift() {
      const hero = branchRef.current?.closest('.hero-section');
      if (!hero) return;
      const heroTop = hero.getBoundingClientRect().top;
      targetDrift = Math.max(0, -heroTop) * 0.5;
      if (!frame) frame = window.requestAnimationFrame(animateText);
    }

    window.addEventListener('scroll', updateDrift, { passive: true });
    window.addEventListener('resize', updateDrift);
    updateDrift();
    return () => {
      window.removeEventListener('scroll', updateDrift);
      window.removeEventListener('resize', updateDrift);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="branch-art" aria-label="Moss and lichen growing on a fallen tree branch" role="img">
      <div className="shader-field" aria-hidden="true">
        <ShaderGradientCanvas style={{ position: 'absolute', inset: 0 }} pixelDensity={1} fov={45}>
          <ShaderGradient
            type="waterPlane"
            animate="on"
            uSpeed={1.15}
            uStrength={5.8}
            uDensity={1.9}
            uFrequency={2.7}
            smoothTime={0.55}
            enableTransition
            color1="#f7fbfd"
            color2="#526b7d"
            color3="#c5d6e1"
            brightness={1.25}
            grain="on"
            grainBlending={0.4}
            cDistance={3.6}
            cPolarAngle={90}
          />
        </ShaderGradientCanvas>
      </div>
      <img ref={branchRef} className="branch-image" src="/mossy-branch.png" alt="" />
      <div className="branch-label"><span className="status-dot" /> MATERIAL TRACEABILITY · VERIFIED</div>
    </div>
  );
}

function VerificationPill({ children }) {
  return <span className="verification-pill"><span className="status-dot" />{children}</span>;
}

function BrandLogo({ brand, className = '' }) {
  return (
    <span className={`brand-logo ${brand.tone} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        {brand.short === 'EG' && <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M24 39V15m0 13c-7 0-11-3.4-12-10 7 0 11 3.3 12 10Zm0-9c.7-7.6 4.9-11.7 12.5-12.3C35.9 14.3 31.7 18.5 24 19Z"/><path d="M17 39h14"/></g>}
        {brand.short === 'NS' && <g stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="m24 5 4.6 13.4L42 24l-13.4 4.6L24 42l-4.6-13.4L6 24l13.4-5.6L24 5Z"/><circle cx="24" cy="24" r="3.2" fill="currentColor" stroke="none"/></g>}
        {brand.short === 'TS' && <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m7 35 11-14 7 8 6-8 10 14H7Z"/><path d="M12 40h24M18 15l4-6 4 6"/></g>}
        {brand.short === 'KS' && <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M8 30c5-5 10-5 15 0s10 5 17 0M8 37c5-5 10-5 15 0s10 5 17 0"/><path d="M25 24c-1-8 3-13 12-15 0 8-4 13-12 15Z"/><path d="M25 24v-8"/></g>}
      </svg>
    </span>
  );
}

const brandProductPositions = {
  EG: '0% 0%',
  NS: '100% 0%',
  TS: '0% 100%',
  KS: '100% 100%',
};

function BrandCard({ brand, onSelectBrand }) {
  return (
    <button className="brand-card" type="button" onClick={() => onSelectBrand(brand)} aria-label={`Open ${brand.name} brand profile and evidence`}>
      <span
        className={`brand-card-visual ${brand.tone}`}
        role="img"
        aria-label={`${brand.name} sample ${brand.category.toLowerCase()} product`}
        style={{ '--product-position': brandProductPositions[brand.short] || 'center' }}
      />
      <span className="brand-card-copy">
        <span className="brand-card-title"><span className="brand-category">{brand.category}</span><strong className="brand-name">{brand.name}</strong></span>
        <span className="brand-claim">“{brand.claim}”</span>
        <span className="brand-card-bottom">
          <span className="brand-card-score" aria-label={`Trust score ${brand.score} out of 100`}>
            <span className="status-dot" />
            <strong>{brand.score}</strong>
            <span className="brand-score-label">Trust score</span>
          </span>
          <span className="brand-profile-link">Open brand profile <ArrowIcon diagonal /></span>
        </span>
      </span>
    </button>
  );
}

function HomePage({ onSelectBrand }) {
  return (
    <main>
        <section className="hero-section">
        <div className="hero-intro">
            <h1>VERITY</h1>
            <p className="hero-description">Turn Sustainability Claims Into Verified Sales.</p>
          </div>
          <BranchArtwork />
      </section>

      <section className="trust-strip" aria-label="Verity verification features">
        <div className="strip-intro"><span className="strip-spark">✳</span><span>Clarity you can feel good about</span></div>
        <div className="strip-item"><span className="strip-icon">01</span><span><strong>Search the Brand:</strong><small>Look up any e-commerce platform.</small></span></div>
        <div className="strip-item"><span className="strip-icon">02</span><span><strong>Real-Time AI Analysis:</strong><small>Our engine instantly scans thousands of pages of ESG reports, public certifications, and supply chain data.</small></span></div>
        <div className="strip-item"><span className="strip-icon">03</span><span><strong>The Verdict:</strong><small>Receive a Verity Report with a clear “Trust Score”—telling you instantly if a brand is actually green, or just greenwashing.</small></span></div>
      </section>

      <section className="brands-section section-wrap" id="trusted-brands">
        <div className="section-heading">
          <div className="section-title"><p className="eyebrow">A MORE OPEN MARKET</p><h2>Good brands.<br /><em>Clear receipts.</em></h2></div>
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

function CompanyLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedInEmail, setLoggedInEmail] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setLoggedInEmail(email.trim());
    setPassword('');
  }

  return (
    <main className="company-login-page">
      <section className="company-login-intro">
        <p className="eyebrow"><Mark className="company-login-leaf" /> VERITY FOR COMPANIES</p>
        <h1>Put your claims<br /><em>on solid ground.</em></h1>
        <p className="company-login-lead">Give shoppers clear, verified evidence at the moment they choose your products.</p>
        <div className="company-login-benefits">
          <div><span>01</span><p><strong>Show the evidence</strong><small>Turn sustainability claims into a transparent evidence chain.</small></p></div>
          <div><span>02</span><p><strong>Build shopper trust</strong><small>Help customers understand what stands behind your products.</small></p></div>
          <div><span>03</span><p><strong>Access company plans</strong><small>Sign in to explore Verity subscription options for your brand.</small></p></div>
        </div>
      </section>

      <section className="company-login-panel" aria-labelledby="company-login-title">
        <div className="company-login-panel-brand"><Mark /><span>COMPANY PORTAL</span></div>
        {loggedInEmail ? (
          <div className="company-login-success" role="status" aria-live="polite">
            <span className="company-login-success-icon" aria-hidden="true">✓</span>
            <p className="eyebrow">ACCESS GRANTED</p>
            <h2 id="company-login-title">You logged in!</h2>
            <p className="company-login-success-copy">You’re signed in as <strong>{loggedInEmail}</strong>. Your company access is ready.</p>
            <div className="company-subscription-note">
              <span>COMPANY SUBSCRIPTIONS</span>
              <p>Verity plans and subscription tools are ready to be connected to this portal.</p>
            </div>
            <button className="login-secondary-button" type="button" onClick={() => { setLoggedInEmail(''); setEmail(''); }}>
              Sign in with another email <ArrowIcon />
            </button>
          </div>
        ) : (
          <>
            <p className="eyebrow">BRAND ACCESS</p>
            <h2 id="company-login-title">Login</h2>
            <p className="company-login-panel-copy">Sign in to explore subscriptions and manage your Verity company profile.</p>
            <form className="company-login-form" onSubmit={handleSubmit}>
              <label htmlFor="company-email">Work email</label>
              <input
                id="company-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <label htmlFor="company-password">Password</label>
              <input
                id="company-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button className="company-login-submit" type="submit">Log in <ArrowIcon /></button>
              <p className="company-login-demo-note">Demo access: no account verification, database, or backend is connected.</p>
            </form>
          </>
        )}
      </section>
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
        <BrandLogo brand={brand} className="brand-logo-profile" />
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
  const [showCompanyLogin, setShowCompanyLogin] = useState(false);

  function showHome() {
    setSelectedBrand(null);
    setShowCompanyLogin(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function navigateTo(id) {
    if (selectedBrand || showCompanyLogin) {
      setSelectedBrand(null);
      setShowCompanyLogin(false);
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'auto' }), 60);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'auto' });
    }
  }

  function openBrand(brand) {
    setSelectedBrand(brand);
    setQuery('');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function openCompanyLogin() {
    setSelectedBrand(null);
    setShowCompanyLogin(true);
    setQuery('');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  return (
    <div className="app-shell">
      <Header query={query} setQuery={setQuery} onSelectBrand={openBrand} onHome={showHome} onNavigate={navigateTo} onCompanyLogin={openCompanyLogin} />
      {selectedBrand ? <BrandProfile brand={selectedBrand} onBack={showHome} /> : showCompanyLogin ? <CompanyLogin /> : <HomePage onSelectBrand={openBrand} />}
    </div>
  );
}
