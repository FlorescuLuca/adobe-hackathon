import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react';
import { authConfigured, getValidSession, signInWithPassword, signUpWithPassword, signOut as signOutAuth } from './auth.js';
import { apiRequest } from './api.js';
import BusinessDashboard from './BusinessDashboard.jsx';
import PublicTransparencyPage from './PublicTransparencyPage.jsx';

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

const featuredBrands = [
  {
    name: 'IKEA',
    short: 'IK',
    category: 'Home furnishing',
    score: null,
    claim: '99.5% of the wood in our products is FSC-certified or recycled',
    source: 'IKEA Sustainability Report FY21',
    valid: 'Company report · FY21',
    tone: 'blue',
    plain: true,
    url: 'https://www.ikea.com',
    status: 'Supported by report',
    scoreCopy: 'Score available after full assessment',
    evidenceLabel: 'From report',
    summary:
      'IKEA’s FY21 Sustainability Report states that 99.5% of the wood used for IKEA products is FSC-certified or recycled (p. 5). The same report shows that only 14% of total wood used is recycled, so a claim that most IKEA wood is recycled would not be supported. Figures are self-reported and were not cross-checked against the FSC registry.',
    evidence: [
      ['Wood sourcing', '99.5% of wood is FSC-certified or recycled (report p. 5)'],
      ['Recycled share', '14% of total wood used is recycled; goal of one-third by 2030 (report p. 5)'],
      ['Evidence limits', 'Self-reported by IKEA; certificates not independently cross-checked'],
    ],
  },
  {
    name: 'Nike',
    short: 'NK',
    category: 'Footwear & apparel',
    score: null,
    claim: 'Assessment pending',
    source: 'No documents reviewed yet',
    valid: 'Not yet assessed',
    tone: 'violet',
    plain: true,
    pending: true,
    url: 'https://www.nike.com',
    status: 'Pending',
    scoreCopy: 'No assessment yet',
    summary:
      'Verity has not assessed Nike yet. Once the company’s sustainability report and marketing claims are uploaded and analysed, the evidence and trust score will appear here.',
    evidence: [],
  },
  {
    name: 'Inditex',
    short: 'IN',
    category: 'Fashion retail',
    score: null,
    claim: 'Assessment pending',
    source: 'No documents reviewed yet',
    valid: 'Not yet assessed',
    tone: 'mint',
    plain: true,
    pending: true,
    url: 'https://www.inditex.com',
    status: 'Pending',
    scoreCopy: 'No assessment yet',
    summary:
      'Verity has not assessed Inditex yet. Once the company’s sustainability report and marketing claims are uploaded and analysed, the evidence and trust score will appear here.',
    evidence: [],
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

function Header({ query, setQuery, products, onSelectProduct, onHome, onNavigate, onCompanyLogin, isSignedIn }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef(null);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products.slice(0, 3);
    return products.filter((product) => `${product.name} ${product.description || ''} ${product.slug}`.toLowerCase().includes(normalized));
  }, [products, query]);

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
            aria-label="Search published products"
            placeholder="Search published products"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && results[0]) onSelectProduct(results[0]);
              if (event.key === 'Escape') setSearchOpen(false);
            }}
          />
          {searchOpen && (
            <div className="search-results">
              <p className="search-label">{query ? 'PUBLISHED PRODUCTS' : 'RECENTLY PUBLISHED'}</p>
              {results.length ? results.map((product) => (
                <button key={product.id} type="button" className="search-result" onMouseDown={() => onSelectProduct(product)}>
                  <span className="mini-brand mint">{product.name.slice(0, 2).toUpperCase()}</span>
                  <span><strong>{product.name}</strong><small>{product.description || 'Transparency profile'} · /{product.slug}</small></span>
                  <ArrowIcon diagonal />
                </button>
              )) : <p className="no-results">No published products match that search.</p>}
            </div>
          )}
        </div>
        <nav className="primary-nav" aria-label="Main navigation">
          <button type="button" onClick={() => onNavigate('trusted-brands')}>Brands</button>
          <button type="button" onClick={() => onNavigate('about')}>About us</button>
          <button type="button" onClick={() => onNavigate('partner')}>Partner with us</button>
          <button className="company-login-nav" type="button" onClick={onCompanyLogin}>
            <span className="company-login-full">{isSignedIn ? 'Dashboard' : 'Login'}</span>
            <span className="company-login-short">{isSignedIn ? 'Dashboard' : 'Log in'}</span>
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
      currentDrift += (targetDrift - currentDrift) * (movingUp ? 0.55 : 0.4);
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
        {!['EG', 'NS', 'TS', 'KS'].includes(brand.short) && <text x="24" y="29" textAnchor="middle" fontSize="14" fontWeight="600" fill="currentColor" stroke="none">{brand.short}</text>}
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

function ProductCard({ product, onSelectProduct, index }) {
  const tones = ['mint', 'blue', 'violet', 'amber'];
  const tone = tones[index % tones.length];
  return (
    <button className="brand-card" type="button" onClick={() => onSelectProduct(product)} aria-label={`Open ${product.name} transparency profile`}>
      <span className={`brand-card-visual ${tone} plain`} role="img" aria-label={`${product.name} transparency profile`}><span className="brand-card-initials">{product.name}</span></span>
      <span className="brand-card-copy">
        <span className="brand-card-title"><span className="brand-category">PUBLISHED PROFILE</span><strong className="brand-name">{product.name}</strong></span>
        <span className="brand-claim">{product.description || 'Explore the product’s published sustainability assessment and supporting evidence.'}</span>
        <span className="brand-card-bottom">
          <span className="brand-card-score"><span className="status-dot" /><span className="brand-score-label">/{product.slug}</span></span>
          <span className="brand-profile-link">View transparency profile <ArrowIcon diagonal /></span>
        </span>
      </span>
    </button>
  );
}

function BrandCard({ brand, onSelectBrand }) {
  return (
    <button className="brand-card" type="button" onClick={() => onSelectBrand(brand)} aria-label={`Open ${brand.name} brand profile and evidence`}>
      <span
        className={`brand-card-visual ${brand.tone}${brand.plain ? ' plain' : ''}`}
        role="img"
        aria-label={brand.plain ? `${brand.name} brand card` : `${brand.name} sample ${brand.category.toLowerCase()} product`}
        style={{ '--product-position': brandProductPositions[brand.short] || 'center' }}
      >{brand.plain && <span className="brand-card-initials">{brand.name}</span>}</span>
      <span className="brand-card-copy">
        <span className="brand-card-title"><span className="brand-category">{brand.category}</span><strong className="brand-name">{brand.name}</strong></span>
        <span className="brand-claim">“{brand.claim}”</span>
        <span className="brand-card-bottom">
          <span className="brand-card-score" aria-label={brand.score ? `Trust score ${brand.score} out of 100` : 'Trust score pending'}>
            <span className="status-dot" />
            <strong>{brand.score ?? '—'}</strong>
            <span className="brand-score-label">{brand.score ? 'Trust score' : brand.pending ? 'Assessment pending' : 'Score pending'}</span>
          </span>
          <span className="brand-profile-link">Open brand profile <ArrowIcon diagonal /></span>
        </span>
      </span>
    </button>
  );
}

function HomePage({ products, productsLoading, onSelectProduct, onSelectBrand, onPartner }) {
  return (
    <main>
        <section className="hero-section">
        <div className="hero-intro">
            <h1>VERITY</h1>
            <p className="hero-description">Turn Sustainability Claims Into Verified Sales</p>
          </div>
          <BranchArtwork />
      </section>

      <section className="brands-section section-wrap" id="trusted-brands">
        <div className="section-heading">
          <div className="section-title"><p className="eyebrow">A MORE OPEN MARKET</p><h2>Good brands.<br /><em>Clear receipts.</em></h2></div>
            <div className="section-heading-aside"><p>Explore published product profiles and the evidence companies provide for their sustainability claims.</p><span className="heading-count">{String(products.length + featuredBrands.length).padStart(2, '0')} <i>PROFILES</i></span></div>
        </div>
        <div className="brand-grid">{featuredBrands.map((brand) => <BrandCard key={brand.name} brand={brand} onSelectBrand={onSelectBrand} />)}{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} onSelectProduct={onSelectProduct} />)}</div>
        {!products.length && productsLoading && <p className="no-published-products">Loading published product profiles…</p>}
        <div className="brand-section-footer"><span className="tiny-orbit">✳</span><span>Verity is growing a more transparent way to shop.</span><button type="button" className="partner-footer-link" onClick={onPartner}>Partner with us <ArrowIcon /></button></div>
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
        <div className="about-copy">
          <div className="about-kicker-row">
            <div className="about-symbol about-symbol-inline" aria-hidden="true"><Mark /><span className="about-orbit" /><span className="about-orbit orbit-b" /></div>
            <p className="eyebrow">A LITTLE ABOUT US</p>
          </div>
          <h2>Good decisions need<br /><em>good information.</em></h2>
          <p>Verity bridges this gap by replacing static, unverified “100% Recycled” or “Eco-Friendly” marketing badges with a dynamic verification layer.</p>
          <div className="about-problem-solution">
            <section className="about-context-block">
              <h3>Problem</h3>
              <p>E-commerce faces a massive trust deficit regarding corporate sustainability. Brands invest heavily in ethical supply chains and eco-friendly marketing, but cynical consumers often dismiss these claims as “greenwashing.”</p>
            </section>
            <section className="about-context-block">
              <h3>Solution</h3>
              <p>We bridge the gap between eco-conscious consumers and authentic brands. Verity shifts the paradigm from <em>unverified marketing claims</em> to <em>independent AI validation</em>. A single search gives you a clear, factual report that either validates or debunks a company’s eco-claims.</p>
            </section>
          </div>
          <p className="about-platform-intro">To deliver transparency for a world that's ready to ask better questions, Verity operates as a two-sided platform:</p>
          <ul className="about-audiences">
            <li>
              <strong>For Conscious Shoppers:</strong>
              <p>We provide a dedicated AI search engine. Instead of taking green marketing at face value, you can search for any brand to see exactly how trusted they are and verify if their sustainability claims are actually true.</p>
            </li>
            <li>
              <strong>For Ethical Brands:</strong>
              <p>We offer a space to make every claim count. Companies that back up their promises can log in, choose a subscription plan, and be prominently featured as a trusted brand on our main page. This allows genuinely sustainable companies to promote their products directly to a high-intent audience that values verified ethics.</p>
            </li>
          </ul>
          <a href="mailto:hello@verity.eco" className="about-link">Get to know Verity <ArrowIcon /></a>
        </div>
        <div className="about-stat"><span className="stat-star">✳</span><strong>Make every<br />claim count.</strong><small>Transparency for a world that’s ready to ask better questions.</small></div>
      </section>

      <footer className="site-footer"><div className="footer-brand"><Mark /><span>verity<span className="wordmark-period">.</span></span></div><p>Proof behind every promise.</p><div className="footer-right"><a href="mailto:hello@verity.eco">Contact</a><span>© 2026 Verity</span><span className="footer-location">Built for better choices <span>✳</span></span></div></footer>
    </main>
  );
}

function CompanyLogin({ onSignedIn, onSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!authConfigured) {
      setError('Supabase is not configured. Add the frontend URL and publishable key to frontend/.env.local.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const nextSession = await signInWithPassword({ email: email.trim(), password });
      setPassword('');
      onSignedIn(nextSession);
    } catch (signInError) {
      setError(signInError.message);
    } finally {
      setBusy(false);
    }
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
        <>
            <p className="eyebrow">BRAND ACCESS</p>
            <h2 id="company-login-title">Login</h2>
            <p className="company-login-panel-copy">Sign in to manage products, evidence documents, and marketing claims.</p>
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
              <button className="company-login-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Log in'} <ArrowIcon /></button>
              {error && <p className="api-alert" role="alert">{error}</p>}
              <p className="company-login-demo-note">Use the account created for your company in Supabase Auth.</p>
            </form>
            <button className="login-secondary-button company-auth-switch" type="button" onClick={onSignUp}>Don’t have an account? Sign up!</button>
        </>
      </section>
    </main>
  );
}

function CompanySignup({ onSignedUp, onBackToLogin }) {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Your passwords don’t match.');
      return;
    }
    if (!authConfigured) {
      setError('Supabase is not configured. Add the frontend URL and publishable key to frontend/.env.local.');
      return;
    }
    setBusy(true);
    try {
      const result = await signUpWithPassword({ companyName: companyName.trim(), email: email.trim(), password });
      if (result.session) {
        setPassword('');
        setConfirmPassword('');
        onSignedUp(result.session);
      } else {
        setConfirmationEmail(result.email || email.trim());
      }
    } catch (signupError) {
      setError(signupError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="company-login-page company-signup-page">
      <section className="company-login-intro">
        <p className="eyebrow"><Mark className="company-login-leaf" /> VERITY FOR COMPANIES</p>
        <h1>Start building<br /><em>trust with proof.</em></h1>
        <p className="company-login-lead">Create a company account to organize product evidence and make verified claims easier to share.</p>
        <div className="company-login-benefits">
          <div><span>01</span><p><strong>One clear workspace</strong><small>Keep product claims and supporting documents together.</small></p></div>
          <div><span>02</span><p><strong>Evidence customers can follow</strong><small>Build transparency pages from your verified information.</small></p></div>
          <div><span>03</span><p><strong>Plans for your stage</strong><small>Choose the tools that fit the way your brand works.</small></p></div>
        </div>
      </section>

      <section className="company-login-panel" aria-labelledby="company-signup-title">
        <div className="company-login-panel-brand"><Mark /><span>COMPANY PORTAL</span></div>
        {confirmationEmail ? (
          <div className="company-login-success" role="status">
            <span className="company-login-success-icon" aria-hidden="true">✓</span>
            <p className="eyebrow">ONE LAST STEP</p>
            <h2 id="company-signup-title">Check your inbox</h2>
            <p className="company-login-success-copy">We sent a confirmation link to <strong>{confirmationEmail}</strong>. Confirm your email, then log in to your company workspace.</p>
            <button className="login-secondary-button" type="button" onClick={onBackToLogin}>Back to login <ArrowIcon /></button>
          </div>
        ) : (
          <>
            <p className="eyebrow">CREATE A COMPANY ACCOUNT</p>
            <h2 id="company-signup-title">Sign up</h2>
            <p className="company-login-panel-copy">Set up your brand’s Verity workspace.</p>
            <form className="company-login-form" onSubmit={handleSubmit}>
              <label htmlFor="signup-company-name">Company name</label>
              <input id="signup-company-name" name="companyName" type="text" autoComplete="organization" placeholder="Your company" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />
              <label htmlFor="signup-company-email">Work email</label>
              <input id="signup-company-email" name="email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <label htmlFor="signup-company-password">Password</label>
              <input id="signup-company-password" name="password" type="password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} required />
              <label htmlFor="signup-company-confirm-password">Confirm password</label>
              <input id="signup-company-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} placeholder="Re-enter your password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
              <button className="company-login-submit" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'} <ArrowIcon /></button>
              {error && <p className="api-alert" role="alert">{error}</p>}
            </form>
            <button className="login-secondary-button company-auth-switch" type="button" onClick={onBackToLogin}>Already have an account? Log in</button>
          </>
        )}
      </section>
    </main>
  );
}

const partnerPlans = [
  {
    name: 'Starter',
    price: '€29',
    audience: 'For small businesses',
    features: [
      '3 products',
      '10 document analyses/month',
      'AI greenwashing detection',
      'Basic transparency pages',
      'QR code generation',
    ],
  },
  {
    name: 'Professional',
    price: '€99',
    audience: 'For growing brands',
    recommended: true,
    features: [
      '25 products',
      '100 document analyses/month',
      'Advanced claim analysis',
      'Supplier evidence management',
      'Embeddable website widget',
      'Analytics dashboard',
      'Priority processing',
    ],
  },
  {
    name: 'Enterprise',
    price: '€399+',
    audience: 'For larger companies',
    features: [
      'Unlimited products subject to fair-use limits',
      'Higher document processing allowance',
      'Multiple team members',
      'API access',
      'Supplier management',
      'Custom integrations',
      'Advanced reporting',
    ],
  },
];

function PartnerPlansPage() {
  return (
    <main className="partner-page">
      <section className="partner-intro section-wrap">
        <p className="eyebrow"><span className="eyebrow-mark">✳</span>VERITY FOR BRANDS</p>
        <h1>Make trust part<br /><em>of your story.</em></h1>
        <p className="partner-intro-copy">Choose your subscription below !</p>
      </section>
      <section className="partner-plans section-wrap" aria-label="Subscription plans">
        <div className="partner-plans-heading">
          <div><p className="eyebrow">SIMPLE MONTHLY PLANS</p><h2>Choose your level<br /><em>of transparency.</em></h2></div>
          <p>Start with the tools you need today, then grow your verification workflow as your brand expands.</p>
        </div>
        <div className="partner-plan-grid">
          {partnerPlans.map((plan) => (
            <article className={`partner-plan-card${plan.recommended ? ' is-recommended' : ''}`} key={plan.name}>
              <div className="partner-plan-topline">
                <span className="partner-plan-index">VERITY / {plan.name === 'Starter' ? '01' : plan.name === 'Professional' ? '02' : '03'}</span>
                {plan.recommended && <span className="partner-recommended"><span className="status-dot" />RECOMMENDED</span>}
              </div>
              <h3>{plan.name}</h3>
              <p className="partner-plan-audience">{plan.audience}</p>
              <div className="partner-plan-price"><strong>{plan.price}</strong><span>/ month</span></div>
              <a className="partner-plan-action" href={`mailto:hello@verity.eco?subject=${encodeURIComponent(`Verity ${plan.name} plan`)}`}>
                {plan.name === 'Enterprise' ? 'Talk to our team' : 'Choose this plan'} <ArrowIcon />
              </a>
              <div className="partner-plan-divider"><span>INCLUDED</span></div>
              <ul>{plan.features.map((feature) => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>
            </article>
          ))}
        </div>
        <p className="partner-plans-note">Need a tailored setup? <a href="mailto:hello@verity.eco?subject=Verity%20partnership">Talk with us about your requirements <ArrowIcon /></a></p>
      </section>
      <footer className="partner-page-footer section-wrap"><span>verity<span className="wordmark-period">.</span></span><span>Evidence for a more informed choice.</span></footer>
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
        <div className="profile-links"><a href="#evidence">View evidence chain <ArrowIcon /></a><a href={brand.url || 'https://example.com'} target="_blank" rel="noreferrer">Visit brand <ArrowIcon diagonal /></a></div>
      </section>
      <div className="profile-content section-wrap">
        <section className="profile-summary panel">
          <div className="panel-heading"><div><p className="eyebrow">AI-GENERATED SUMMARY</p><h2>What the evidence says</h2></div><span className="summary-spark">✳</span></div>
          <p className="summary-text">{brand.summary}</p>
          <div className="claim-box"><span className="claim-icon">“</span><div><small>THE BRAND CLAIM</small><strong>{brand.claim}</strong><small className="claim-source">Evidence source · {brand.source}</small></div><span className="claim-status"><span className="status-dot" />{brand.status || 'Supported'}</span></div>
          <p className="summary-disclaimer">This summary reflects the documents and public records reviewed by Verity at the time shown. It is designed to make the evidence easier to understand.</p>
        </section>
        <aside className="profile-score panel">
          <p className="eyebrow">VERITY TRUST SCORE</p>
          <div className="score-dial" style={{ '--score': `${brand.score || 0}%` }}><div><strong>{brand.score ?? '—'}</strong><small> / 100</small></div></div>
          <p className="score-copy">{brand.scoreCopy || 'Strong evidence coverage'}</p>
          <span className="score-timestamp"><span className="status-dot" /> Updated recently</span>
        </aside>
        <section className="evidence-section" id="evidence">
          <div className="evidence-heading"><div><p className="eyebrow">FOLLOW THE PROOF</p><h2>Evidence chain</h2></div><span>{brand.evidence.length} SOURCES REVIEWED</span></div>
          <div className="evidence-list">{!brand.evidence.length && <p className="summary-text">No evidence has been reviewed for this brand yet.</p>}{brand.evidence.map(([title, detail], index) => <article className="evidence-row" key={title}><span className="evidence-index">0{index + 1}</span><span className="evidence-check">✓</span><div><h3>{title}</h3><p>{detail}</p></div><span className="evidence-valid">{brand.evidenceLabel || 'Verified'}</span></article>)}</div>
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
  const [activePage, setActivePage] = useState('home');
  const [session, setSession] = useState(null);
  const [publicSlug, setPublicSlug] = useState(() => decodeURIComponent(window.location.pathname.match(/^\/p\/([^/]+)/)?.[1] || ''));
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    getValidSession().then(setSession);
  }, []);

  useEffect(() => {
    if (activePage !== 'home' || publicSlug) return;
    let cancelled = false;
    setProductsLoading(true);
    apiRequest('/public/products')
      .then((publishedProducts) => { if (!cancelled) setProducts(publishedProducts); })
      .catch(() => { if (!cancelled) setProducts([]); })
      .finally(() => { if (!cancelled) setProductsLoading(false); });
    return () => { cancelled = true; };
  }, [activePage, publicSlug]);

  useEffect(() => {
    function syncPath() {
      setPublicSlug(decodeURIComponent(window.location.pathname.match(/^\/p\/([^/]+)/)?.[1] || ''));
      setSelectedBrand(null);
      setActivePage('home');
    }
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, []);

  function showHome() {
    if (window.location.pathname !== '/') window.history.pushState({}, '', '/');
    setPublicSlug('');
    setSelectedBrand(null);
    setActivePage('home');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function navigateTo(id) {
    if (id === 'partner') {
      setSelectedBrand(null);
      setActivePage('partner');
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    const returnToHome = selectedBrand || activePage !== 'home';
    if (returnToHome) {
      setSelectedBrand(null);
      setActivePage('home');
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'auto' }), 60);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'auto' });
  }

  function openBrand(brand) {
    setSelectedBrand(brand);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function openProduct(product) {
    const slug = product.slug;
    window.history.pushState({}, '', `/p/${encodeURIComponent(slug)}`);
    setPublicSlug(slug);
    setSelectedBrand(null);
    setActivePage('home');
    setQuery('');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function openCompanyLogin() {
    setSelectedBrand(null);
    setPublicSlug('');
    setActivePage(session ? 'dashboard' : 'login');
    setQuery('');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function openCompanySignup() {
    setSelectedBrand(null);
    setPublicSlug('');
    setActivePage('signup');
    setQuery('');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function returnToCompanyLogin() {
    setActivePage('login');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  async function signOut() {
    await signOutAuth();
    setSession(null);
    setActivePage('home');
    showHome();
  }

  return (
    <div className={`app-shell${activePage === 'partner' ? ' partner-active' : ''}`}>
      <Header query={query} setQuery={setQuery} products={products} onSelectProduct={openProduct} onHome={showHome} onNavigate={navigateTo} onCompanyLogin={openCompanyLogin} isSignedIn={Boolean(session)} />
      {publicSlug ? <PublicTransparencyPage slug={publicSlug} onHome={showHome} /> : selectedBrand ? <BrandProfile brand={selectedBrand} onBack={showHome} /> : activePage === 'partner' ? <PartnerPlansPage /> : activePage === 'signup' ? <CompanySignup onBackToLogin={returnToCompanyLogin} onSignedUp={(nextSession) => { setSession(nextSession); setActivePage('dashboard'); }} /> : activePage === 'login' ? <CompanyLogin onSignUp={openCompanySignup} onSignedIn={(nextSession) => { setSession(nextSession); setActivePage('dashboard'); }} /> : activePage === 'dashboard' && session ? <BusinessDashboard session={session} onSignOut={signOut} /> : <HomePage products={products} productsLoading={productsLoading} onSelectProduct={openProduct} onSelectBrand={openBrand} onPartner={() => navigateTo('partner')} />}
    </div>
  );
}
