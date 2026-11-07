# 🌱 Verity
**Adobe Hackathon — Theme: Marketing Reimagined**

> *Good decisions need good information. Verity exists to make sustainability less of a leap of faith. We connect the words on a product page to the documents, standards, and suppliers behind them—so shoppers and brands can meet in a place built on trust.*

##  The Problem: The Trust Deficit in Brand Sustainability
When every product is labeled "eco-friendly," who can we trust? Brands are communicating more than ever about ethical and sustainable products, but consumers struggle to verify these claims. Information is scattered across dense technical documents, marketing pages, and confusing certifications. 

**The Result:** Consumer skepticism, accusations of "greenwashing," and a massive disadvantage for genuinely transparent brands trying to stand out.

##  The Solution
**Verity** is a two-sided transparency platform that turns vague sustainability claims into verified, easy-to-understand data. 
* **For Conscious Shoppers:** A dedicated AI search engine to look up brands, explore products, and see exactly what evidence supports their sustainability claims. 
* **For Ethical Brands:** A subscription-based platform to upload proof, back up their marketing, and be featured as a trusted brand directly to a high-intent audience.

## How It Works (AI & Architecture)
1. **Data Ingestion:** The brand inputs marketing claims and uploads supporting documentation.
2. **AI Processing:** An LLM analyzes the technical, lengthy sustainability documents to extract relevant proof points.
3. **Synthesis & Transparency:** The AI presents a clear explanation on the Brand Evidence Profile. If evidence is incomplete or unclear, Verity intentionally highlights this limitation to maintain absolute consumer trust.
4. **Public Profile:** The structured data is published to the brand's public profile on the Verity platform.

## Tech Stack
- **Frontend:** React 18, Vite 5, JavaScript, CSS
- **API and AI engine:** Python, FastAPI, Pydantic, PyMuPDF, OpenAI API
- **Auth, database, and file storage:** Supabase Auth, PostgreSQL, and Supabase Storage
- **Frontend styling:** regular CSS; Tailwind CSS is not used

##  Running Locally

### Prerequisites
- Node.js 18 or newer and npm
- Python 3.11 or newer
- A Supabase project
- An OpenAI API key for AI assessments

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/FlorescuLuca/adobe-hackathon.git](https://github.com/FlorescuLuca/adobe-hackathon.git)
   cd adobe-hackathon/frontend
   npm run dev
