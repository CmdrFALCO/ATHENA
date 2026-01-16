/**
 * Test Note Seeding Utility for Hybrid Search Testing
 *
 * Creates 20 diverse notes across different domains to test:
 * - Keyword-only matches (exact terms)
 * - Semantic-only matches (conceptual similarity)
 * - Hybrid matches (both keyword AND semantic)
 * - Edge cases (short content, overlapping topics, synonyms)
 */

import type { Block, Note } from '@/shared/types';
import type { INoteAdapter } from '@/adapters';

/**
 * Convert plain text paragraphs to Tiptap Block format
 */
function textToTiptapBlocks(text: string): Block[] {
  const paragraphs = text
    .split('\n\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return paragraphs.map((paragraph) => ({
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: paragraph,
      },
    ],
  }));
}

/**
 * Test note definitions
 */
const TEST_NOTES_DATA: Array<{ title: string; content: string }> = [
  // Set 1: Technology Domain (Test Synonyms & Concepts)
  {
    title: 'Machine Learning Fundamentals',
    content: `Machine learning is a subset of artificial intelligence that enables systems to learn from data. Neural networks, inspired by biological neurons, form the foundation of deep learning approaches.

Training data quality is paramount. Models learn patterns from examples, so biased or incomplete datasets lead to poor generalization. Data preprocessing, augmentation, and cleaning are critical steps.

Optimization algorithms like stochastic gradient descent adjust model weights iteratively. Learning rate scheduling, momentum, and adaptive methods like Adam improve convergence. Regularization techniques prevent overfitting.`,
  },
  {
    title: 'Deep Neural Network Architectures',
    content: `Modern deep learning relies on sophisticated network architectures. Convolutional Neural Networks (CNNs) use spatial filters to detect patterns in images, enabling computer vision applications.

Transformers introduced the attention mechanism, allowing models to weigh the importance of different input elements. Self-attention enables parallel processing and captures long-range dependencies. BERT and GPT are transformer-based models.

Architectural innovations continue rapidly. Vision Transformers (ViT) apply attention to images. Mixture of Experts (MoE) scales models efficiently. Neural architecture search automates design.`,
  },
  {
    title: 'AI Ethics and Bias',
    content: `Artificial intelligence systems can perpetuate and amplify societal biases present in training data. Algorithmic fairness requires careful consideration of protected attributes and outcome disparities.

Dataset bias manifests in various forms: selection bias, measurement bias, and historical bias. Synthetic data generation and resampling techniques can partially mitigate these issues.

Responsible AI development involves transparency, explainability, and accountability. Model cards document intended use cases and limitations. Bias audits should be part of the deployment pipeline.`,
  },
  {
    title: 'Python Data Science Stack',
    content: `Python dominates data science due to its rich ecosystem. NumPy provides efficient numerical computing with n-dimensional arrays. Pandas offers data manipulation through DataFrames with intuitive syntax.

Scikit-learn implements classical machine learning algorithms with a consistent API. Preprocessing, model selection, and evaluation utilities streamline the ML workflow. Pipeline objects chain transformations.

Jupyter notebooks enable interactive development and visualization. Matplotlib and Seaborn create publication-quality plots. The ecosystem integrates seamlessly for end-to-end analysis.`,
  },
  {
    title: 'GPU Computing for Training',
    content: `Graphics Processing Units accelerate deep learning by parallelizing matrix operations. CUDA enables general-purpose GPU programming on NVIDIA hardware. Tensor cores provide mixed-precision acceleration.

VRAM capacity limits model and batch size. Gradient checkpointing trades compute for memory. Model parallelism distributes layers across multiple GPUs. Data parallelism replicates models.

Cloud GPU instances from AWS, GCP, and Azure democratize access. Cost optimization involves spot instances and efficient scheduling. Monitoring utilization ensures resources aren't wasted.`,
  },

  // Set 2: Business Domain (Test Exact vs Conceptual)
  {
    title: 'Q4 Revenue Analysis',
    content: `Fourth quarter revenue exceeded projections by 12%, reaching $4.2M. Enterprise segment drove growth with three major contract wins. SMB segment remained flat due to seasonal churn.

Year-over-year growth accelerated to 45%, up from 38% in Q3. Monthly recurring revenue (MRR) hit an all-time high of $380K. Net revenue retention improved to 115%.

Regional breakdown shows EMEA outperforming with 60% growth. North America maintained steady 35% growth. APAC expansion is early but promising with key partnerships established.`,
  },
  {
    title: 'Financial Performance Review',
    content: `Profit margins improved 3 percentage points to 18% gross margin. Operating expenses remained controlled despite headcount growth. EBITDA turned positive for the first time.

Cash flow from operations was $1.2M, providing 18 months runway. Accounts receivable days improved from 45 to 38. Working capital management reduced cash conversion cycle.

The balance sheet strengthened with debt reduction. Investment in R&D increased to 25% of revenue. Capital expenditure focused on infrastructure scaling for anticipated growth.`,
  },
  {
    title: 'Customer Acquisition Strategy',
    content: `Customer acquisition cost (CAC) optimization is a priority. Marketing funnel analysis revealed conversion bottlenecks at the demo stage. Improved qualification criteria increased demo-to-close rate.

Content marketing generates 40% of inbound leads. SEO investments are paying off with organic traffic up 80%. Paid acquisition channels show declining efficiency, prompting reallocation.

Referral programs launched with 20% incentive. Early results show referred customers have 30% higher LTV. Partner channel development targets system integrators and consultants.`,
  },
  {
    title: 'Growth Hacking Tactics',
    content: `Viral loops embedded in the product drive organic growth. User invitations with mutual benefit increase conversion. Social sharing features amplify reach without paid spend.

Product-led growth reduces reliance on sales. Free tier acquisition feeds the upgrade funnel. Usage-based triggers prompt upgrade conversations at optimal moments.

Retention optimization precedes acquisition scaling. Cohort analysis identifies at-risk segments. Proactive outreach and feature education reduce churn. NPS surveys guide product priorities.`,
  },
  {
    title: 'Startup Funding Rounds',
    content: `Seed funding typically ranges from $500K to $3M, exchanging 15-25% equity. Angel investors and micro-VCs participate at this stage. Convertible notes and SAFEs simplify early deals.

Series A follows product-market fit signals. Round sizes of $5-15M are common, with institutional VCs leading. Due diligence covers metrics, team, and market opportunity.

Valuation methodologies differ by stage. Early rounds use comparables and potential. Later rounds apply revenue multiples. Term sheets specify preferences, anti-dilution, and governance.`,
  },

  // Set 3: Science Domain (Test Technical Precision)
  {
    title: 'Thermal Management in Electronics',
    content: `Electronic components generate heat during operation. Thermal management prevents overheating and ensures reliability. Junction temperature limits determine maximum operating conditions.

Heat sinks increase surface area for convection. Thermal paste fills microscopic gaps between components and heat sinks. Thermal pads provide electrical isolation with heat transfer.

Active cooling with fans forces airflow over components. Heat pipes transport heat efficiently over distance. Vapor chambers spread heat across larger areas for dissipation.`,
  },
  {
    title: 'Heat Dissipation Strategies',
    content: `Effective cooling requires understanding heat transfer modes. Conduction moves heat through solid materials. Convection transfers heat to moving fluids like air or liquid.

Airflow design in enclosures matters significantly. Positive pressure prevents dust ingress. Strategic vent placement creates effective flow paths. CFD simulation optimizes designs.

Liquid cooling provides superior heat removal. Closed-loop systems circulate coolant through cold plates. Immersion cooling submerges components in dielectric fluid for maximum effect.`,
  },
  {
    title: 'Temperature Control Systems',
    content: `Precise temperature control requires feedback loops. Thermocouples and RTDs sense temperature with different characteristics. Signal conditioning converts sensor output to usable values.

PID controllers adjust heating or cooling based on error. Proportional gain determines response magnitude. Integral action eliminates steady-state error. Derivative action dampens oscillation.

HVAC systems maintain environmental conditions. Zoning allows different setpoints in areas. Building management systems coordinate equipment. Energy efficiency drives modern designs.`,
  },
  {
    title: 'Quantum Computing Basics',
    content: `Quantum computers exploit quantum mechanical phenomena for computation. Qubits can exist in superposition, representing 0 and 1 simultaneously. This enables parallel exploration of solution spaces.

Entanglement creates correlations between qubits. Measuring one instantly affects its entangled partner. Quantum algorithms leverage entanglement for speedups on specific problems.

Quantum decoherence is the primary engineering challenge. Environmental noise destroys quantum states. Error correction requires many physical qubits per logical qubit. Cryogenic cooling maintains coherence.`,
  },
  {
    title: 'Post-Quantum Cryptography',
    content: `Current cryptographic systems are vulnerable to quantum attacks. Shor's algorithm breaks RSA and ECC in polynomial time. Preparing for quantum-capable adversaries is urgent.

Lattice-based cryptography resists known quantum algorithms. Learning With Errors (LWE) problems are computationally hard. NIST standardized CRYSTALS-Kyber and CRYSTALS-Dilithium.

Hash-based signatures provide another quantum-resistant approach. SPHINCS+ uses hash functions extensively. Code-based and multivariate schemes offer additional options with different tradeoffs.`,
  },

  // Set 4: Edge Cases
  {
    title: 'Quick Note',
    content: `Remember to follow up on this later. Just capturing a quick thought before it escapes.`,
  },
  {
    title: 'API Design Patterns',
    content: `REST APIs use HTTP methods semantically. GET retrieves resources, POST creates, PUT updates, DELETE removes. Resource-oriented URLs improve discoverability and caching.

GraphQL provides flexible querying. Clients specify exactly what data they need. Schema definitions enable tooling and documentation. Resolvers fetch data from various sources.

API versioning strategies include URL paths, headers, and query parameters. Breaking changes require careful migration planning. Deprecation policies give clients transition time.`,
  },
  {
    title: 'Meeting Notes 2024-01-15',
    content: `Attendees: Alice, Bob, Carol, Dave

Key decisions:
- Launch date confirmed for March 1st
- Budget approved for contractor support
- Weekly syncs moving to Tuesdays

Action items:
- Alice: Finalize specifications by Friday
- Bob: Set up staging environment
- Carol: Draft announcement email
- Dave: Coordinate with legal on terms update`,
  },
  {
    title: 'Project Alpha Status Update',
    content: `Current milestone: Phase 2 implementation (70% complete)

Completed this week:
- Database migration finished
- API endpoints deployed
- Initial testing passed

Blockers:
- Waiting on third-party API credentials
- Design review scheduled for Thursday

Next steps:
- Complete integration testing
- Performance optimization
- Documentation update`,
  },
  {
    title: 'Untitled',
    content: `Random collection of thoughts from today. Should try that new Italian restaurant downtown. The pasta looked amazing in photos.

Also thinking about vacation plans. Maybe somewhere warm in February? Need to check flight prices.

Work stuff: remember to update the spreadsheet. The formula in column G might be wrong. Ask Sarah about the discrepancy in the numbers.`,
  },
];

export interface SeedResult {
  created: number;
  failed: number;
  notes: Note[];
}

/**
 * Seed the database with test notes for hybrid search testing
 */
export async function seedTestNotes(
  noteAdapter: INoteAdapter,
  addNoteToStore: (note: Note) => void
): Promise<SeedResult> {
  const result: SeedResult = {
    created: 0,
    failed: 0,
    notes: [],
  };

  // Calculate starting position (grid layout)
  const startX = 100;
  const startY = 100;
  const colWidth = 280;
  const rowHeight = 200;
  const cols = 4;

  for (const [index, noteData] of TEST_NOTES_DATA.entries()) {
    const col = index % cols;
    const row = Math.floor(index / cols);

    try {
      const note = await noteAdapter.create({
        type: 'note',
        subtype: 'zettelkasten',
        title: noteData.title,
        content: textToTiptapBlocks(noteData.content),
        metadata: { isTestData: true },
        position_x: startX + col * colWidth,
        position_y: startY + row * rowHeight,
      });

      addNoteToStore(note);
      result.notes.push(note);
      result.created++;

      console.log(`[SeedTestNotes] Created: ${noteData.title}`);
    } catch (error) {
      console.error(`[SeedTestNotes] Failed to create: ${noteData.title}`, error);
      result.failed++;
    }
  }

  console.log(
    `[SeedTestNotes] Complete: ${result.created} created, ${result.failed} failed`
  );

  return result;
}

/**
 * Delete all test notes (those with isTestData metadata)
 */
export async function deleteTestNotes(
  noteAdapter: INoteAdapter,
  getAllNotes: () => Note[],
  removeNoteFromStore: (id: string) => void
): Promise<number> {
  const notes = getAllNotes();
  const testNotes = notes.filter((n) => n.metadata?.isTestData === true);

  let deleted = 0;
  for (const note of testNotes) {
    try {
      await noteAdapter.delete(note.id);
      removeNoteFromStore(note.id);
      deleted++;
    } catch (error) {
      console.error(`[DeleteTestNotes] Failed to delete: ${note.title}`, error);
    }
  }

  console.log(`[DeleteTestNotes] Deleted ${deleted} test notes`);
  return deleted;
}

/**
 * Get count of existing test notes
 */
export function countTestNotes(notes: Note[]): number {
  return notes.filter((n) => n.metadata?.isTestData === true).length;
}
