/**
 * WP 7.5 Test Script - Copy-paste into browser console
 *
 * Prerequisites:
 * 1. App is running and loaded
 * 2. DevTools console is open
 *
 * Usage:
 * 1. Copy this entire script
 * 2. Paste into browser console
 * 3. Press Enter
 * 4. The chat panel will open with test proposals
 */

(async function testWP75() {
  console.log('🧪 WP 7.5 - Proposal Cards UI Test');
  console.log('================================');

  // Access global state
  const chatState$ = window.__ATHENA_CHAT__?.chatState$ || window.__ATHENA_STATE__?.chat;
  const chatActions = window.__ATHENA_CHAT__;

  if (!chatActions) {
    console.error('❌ Chat module not found. Make sure the app is loaded.');
    console.log('   Looking for: window.__ATHENA_CHAT__');
    return;
  }

  // Ensure we have an active thread
  let threadId = chatState$.activeThreadId.peek();
  if (!threadId) {
    console.log('📝 Creating test thread...');
    threadId = await chatActions.createThread('WP 7.5 Test');
  }

  console.log(`📌 Using thread: ${threadId}`);

  // Add user message
  await chatActions.addMessage({
    threadId,
    role: 'user',
    content: 'Tell me about quantum computing and machine learning.',
  });

  // Create test proposals
  const proposals = {
    nodes: [
      {
        id: crypto.randomUUID(),
        title: 'Quantum Computing Fundamentals',
        content: 'Quantum computing uses qubits that can exist in superposition, allowing parallel computation of multiple states. Key concepts include entanglement, quantum gates, and decoherence.',
        suggestedConnections: ['Machine Learning', 'Cryptography'],
        confidence: 0.88,
        status: 'pending',
      },
      {
        id: crypto.randomUUID(),
        title: 'Quantum Machine Learning',
        content: 'QML applies quantum computing to machine learning tasks. Potential advantages include faster training for certain models and ability to process quantum data.',
        suggestedConnections: ['Quantum Computing Fundamentals'],
        confidence: 0.75,
        status: 'pending',
      },
    ],
    edges: [
      {
        id: crypto.randomUUID(),
        fromTitle: 'Quantum Computing Fundamentals',
        toTitle: 'Machine Learning',
        label: 'accelerates',
        rationale: 'Quantum speedup for optimization problems common in ML',
        confidence: 0.82,
        status: 'pending',
      },
      {
        id: crypto.randomUUID(),
        fromTitle: 'Quantum Computing Fundamentals',
        toTitle: 'Quantum Machine Learning',
        label: 'enables',
        rationale: 'QML requires understanding of quantum computing basics',
        confidence: 0.91,
        status: 'pending',
      },
    ],
  };

  // Create assistant message with proposals
  const testMessage = {
    id: crypto.randomUUID(),
    threadId,
    role: 'assistant',
    content: `Great question! Quantum computing and machine learning are two cutting-edge fields that are beginning to converge.

Quantum computers leverage quantum mechanical properties like superposition and entanglement to process information in fundamentally different ways than classical computers. This has potential implications for machine learning, where many algorithms rely on optimization and matrix operations.

I've identified some key concepts worth capturing:`,
    createdAt: new Date().toISOString(),
    proposals,
  };

  // Inject into state
  const messages = chatState$.messages.peek();
  const current = messages[threadId] || [];
  chatState$.messages.set({
    ...messages,
    [threadId]: [...current, testMessage],
  });

  // Open chat panel
  chatActions.open();

  console.log('');
  console.log('✅ Test message injected!');
  console.log('');
  console.log('📊 Proposals created:');
  console.log(`   🟢 ${proposals.nodes.length} node proposals (green cards)`);
  console.log(`   🔵 ${proposals.edges.length} edge proposals (blue cards)`);
  console.log('');
  console.log('🧪 Test Checklist:');
  console.log('   [ ] Chat panel opened');
  console.log('   [ ] Green node cards visible');
  console.log('   [ ] Blue edge cards visible');
  console.log('   [ ] Edge cards show warning (accept nodes first)');
  console.log('   [ ] Confidence % shown on cards');
  console.log('   [ ] Click Accept on node → note appears in sidebar');
  console.log('   [ ] After accepting node, related edge card enabled');
  console.log('   [ ] Click Reject → card disappears');
  console.log('   [ ] Spinner shows during accept');
  console.log('');
  console.log('🔧 Utility commands:');
  console.log('   // Change confidence filter threshold:');
  console.log('   __ATHENA_DEV_SETTINGS__.chat.extraction.minConfidenceThreshold.set(0.8)');
  console.log('');
  console.log('   // Check proposal status:');
  console.log(`   __ATHENA_CHAT__.chatState$.messages.peek()['${threadId}']`);
  console.log('');
  console.log(`📝 Message ID: ${testMessage.id}`);

  return testMessage.id;
})();
