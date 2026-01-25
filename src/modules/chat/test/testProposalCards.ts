/**
 * Test script for WP 7.5 - Proposal Cards UI
 *
 * Run this in the browser console after the app loads:
 * 1. Open DevTools console
 * 2. Copy-paste this entire script
 * 3. Call testProposalCards()
 *
 * Or import and call from a component during development.
 */

import { chatState$ } from '../store/chatState';
import { chatActions } from '../store/chatActions';
import type { ChatMessage, KnowledgeProposals } from '../types';

// Test data: realistic proposals
const createTestProposals = (): KnowledgeProposals => ({
  nodes: [
    {
      id: crypto.randomUUID(),
      title: 'Quantum Computing Basics',
      content:
        'Quantum computing leverages quantum mechanical phenomena such as superposition and entanglement to perform computations. Unlike classical bits, quantum bits (qubits) can exist in multiple states simultaneously.',
      suggestedConnections: ['Machine Learning', 'Cryptography'],
      confidence: 0.88,
      status: 'pending',
    },
    {
      id: crypto.randomUUID(),
      title: 'Quantum Machine Learning',
      content:
        'QML combines quantum computing with machine learning algorithms. Quantum computers may offer speedups for certain ML tasks like optimization and sampling.',
      suggestedConnections: ['Quantum Computing Basics'],
      confidence: 0.72,
      status: 'pending',
    },
  ],
  edges: [
    {
      id: crypto.randomUUID(),
      fromTitle: 'Quantum Computing Basics',
      toTitle: 'Machine Learning',
      // fromId/toId left undefined - tests dependency resolution
      label: 'enables',
      rationale: 'Quantum algorithms can accelerate certain ML computations',
      confidence: 0.8,
      status: 'pending',
    },
    {
      id: crypto.randomUUID(),
      fromTitle: 'Quantum Computing Basics',
      toTitle: 'Quantum Machine Learning',
      label: 'foundational to',
      rationale: 'QML builds upon quantum computing principles',
      confidence: 0.9,
      status: 'pending',
    },
  ],
});

/**
 * Injects a test message with proposals into the active chat thread.
 * Creates a new thread if none exists.
 */
export async function testProposalCards(): Promise<string> {
  console.log('🧪 Testing WP 7.5 - Proposal Cards UI');

  // Ensure we have an active thread
  let threadId = chatState$.activeThreadId.peek();
  if (!threadId) {
    console.log('  Creating test thread...');
    threadId = await chatActions.createThread('WP 7.5 Test Thread');
  }

  // Add a user message first (for context)
  await chatActions.addMessage({
    threadId,
    role: 'user',
    content: 'Tell me about quantum computing and how it relates to machine learning.',
  });

  // Create test message with proposals
  const testMessage: ChatMessage = {
    id: crypto.randomUUID(),
    threadId,
    role: 'assistant',
    content: `Quantum computing is a fascinating field that's beginning to intersect with machine learning in interesting ways.

Quantum computers use qubits instead of classical bits, allowing them to explore many possibilities simultaneously through superposition. This property makes them potentially powerful for optimization problems common in ML.

I've identified some knowledge that might be worth capturing:`,
    createdAt: new Date().toISOString(),
    proposals: createTestProposals(),
  };

  // Add to state
  const messages = chatState$.messages.peek();
  const current = messages[threadId] || [];
  chatState$.messages.set({
    ...messages,
    [threadId]: [...current, testMessage],
  });

  // Open the chat panel
  chatActions.open();

  console.log('✅ Test message injected with proposals:');
  console.log(`   - ${testMessage.proposals?.nodes.length} node proposals`);
  console.log(`   - ${testMessage.proposals?.edges.length} edge proposals`);
  console.log('');
  console.log('📋 Test checklist:');
  console.log('   [ ] Green node cards visible with title, content preview');
  console.log('   [ ] Blue edge cards visible with from→to arrows');
  console.log('   [ ] Edge cards show amber warning (nodes not accepted yet)');
  console.log('   [ ] Confidence percentages displayed');
  console.log('   [ ] Accept button creates note (check sidebar)');
  console.log('   [ ] After accepting node, edge card becomes enabled');
  console.log('   [ ] Reject button dismisses card');
  console.log('   [ ] Cards disappear after accept/reject');
  console.log('');
  console.log(`Message ID: ${testMessage.id}`);

  return testMessage.id;
}

/**
 * Test with an existing note to verify edge connection works
 */
export async function testEdgeWithExistingNote(existingNoteTitle: string): Promise<string> {
  console.log(`🧪 Testing edge proposal with existing note: "${existingNoteTitle}"`);

  let threadId = chatState$.activeThreadId.peek();
  if (!threadId) {
    threadId = await chatActions.createThread('Edge Test Thread');
  }

  const testMessage: ChatMessage = {
    id: crypto.randomUUID(),
    threadId,
    role: 'assistant',
    content: `I found a connection to your existing note "${existingNoteTitle}".`,
    createdAt: new Date().toISOString(),
    proposals: {
      nodes: [
        {
          id: crypto.randomUUID(),
          title: 'New Related Concept',
          content: 'This is a new concept that relates to your existing note.',
          suggestedConnections: [existingNoteTitle],
          confidence: 0.85,
          status: 'pending',
        },
      ],
      edges: [
        {
          id: crypto.randomUUID(),
          fromTitle: 'New Related Concept',
          toTitle: existingNoteTitle,
          // toId will be resolved if the note exists
          label: 'related to',
          rationale: 'Conceptually connected',
          confidence: 0.78,
          status: 'pending',
        },
      ],
    },
  };

  const messages = chatState$.messages.peek();
  const current = messages[threadId] || [];
  chatState$.messages.set({
    ...messages,
    [threadId]: [...current, testMessage],
  });

  chatActions.open();

  console.log('✅ Test message with existing note reference injected');
  console.log(`   Edge references: "New Related Concept" → "${existingNoteTitle}"`);

  return testMessage.id;
}

/**
 * Test low confidence filtering
 */
export async function testConfidenceFiltering(): Promise<void> {
  console.log('🧪 Testing confidence threshold filtering');

  let threadId = chatState$.activeThreadId.peek();
  if (!threadId) {
    threadId = await chatActions.createThread('Confidence Test Thread');
  }

  const testMessage: ChatMessage = {
    id: crypto.randomUUID(),
    threadId,
    role: 'assistant',
    content: 'Testing confidence threshold filtering:',
    createdAt: new Date().toISOString(),
    proposals: {
      nodes: [
        {
          id: crypto.randomUUID(),
          title: 'High Confidence Note',
          content: 'This should be visible (0.9 confidence)',
          suggestedConnections: [],
          confidence: 0.9,
          status: 'pending',
        },
        {
          id: crypto.randomUUID(),
          title: 'Low Confidence Note',
          content: 'This should be hidden if threshold > 0.3 (0.3 confidence)',
          suggestedConnections: [],
          confidence: 0.3,
          status: 'pending',
        },
      ],
      edges: [],
    },
  };

  const messages = chatState$.messages.peek();
  const current = messages[threadId] || [];
  chatState$.messages.set({
    ...messages,
    [threadId]: [...current, testMessage],
  });

  chatActions.open();

  console.log('✅ Injected proposals with varying confidence:');
  console.log('   - High Confidence Note: 0.9 (should be visible)');
  console.log('   - Low Confidence Note: 0.3 (hidden if threshold > 0.3)');
  console.log('');
  console.log('To test filtering, change the threshold:');
  console.log('  __ATHENA_DEV_SETTINGS__.chat.extraction.minConfidenceThreshold.set(0.5)');
}

/**
 * Reset test state - removes test messages
 */
export function cleanupTestMessages(): void {
  const threads = chatState$.threads.peek();
  const testThreadIds = Object.values(threads)
    .filter((t) => t.title.includes('Test Thread'))
    .map((t) => t.id);

  for (const threadId of testThreadIds) {
    chatActions.deleteThread(threadId);
  }

  console.log(`🧹 Cleaned up ${testThreadIds.length} test thread(s)`);
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__TEST_PROPOSAL_CARDS__ = {
    testProposalCards,
    testEdgeWithExistingNote,
    testConfidenceFiltering,
    cleanupTestMessages,
  };

  console.log('📦 WP 7.5 Test utilities loaded. Available functions:');
  console.log('   __TEST_PROPOSAL_CARDS__.testProposalCards()');
  console.log('   __TEST_PROPOSAL_CARDS__.testEdgeWithExistingNote("Note Title")');
  console.log('   __TEST_PROPOSAL_CARDS__.testConfidenceFiltering()');
  console.log('   __TEST_PROPOSAL_CARDS__.cleanupTestMessages()');
}
