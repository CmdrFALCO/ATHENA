import { chatState$ } from './chatState';
import type { ChatMessage, ChatThread } from '../types';
import { chatPersistence } from '../services/ChatPersistence';

/**
 * Chat actions for managing threads and messages.
 * WP 7.1 - Chat UI & State
 */
export const chatActions = {
  // Panel visibility
  open: () => chatState$.isOpen.set(true),
  close: () => chatState$.isOpen.set(false),
  toggle: () => chatState$.isOpen.set(!chatState$.isOpen.peek()),

  // Thread management
  createThread: async (title?: string): Promise<string> => {
    const id = crypto.randomUUID();
    const thread: ChatThread = {
      id,
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      contextNodeIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const threads = chatState$.threads.peek();
    const messages = chatState$.messages.peek();
    chatState$.threads.set({ ...threads, [id]: thread });
    chatState$.messages.set({ ...messages, [id]: [] });
    chatState$.activeThreadId.set(id);

    // Persist to IndexedDB
    await chatPersistence.saveThread(thread);

    return id;
  },

  switchThread: (threadId: string) => {
    chatState$.activeThreadId.set(threadId);
  },

  deleteThread: async (threadId: string) => {
    const threads = chatState$.threads.peek();
    const messages = chatState$.messages.peek();

    const newThreads = { ...threads };
    delete newThreads[threadId];
    chatState$.threads.set(newThreads);

    const newMessages = { ...messages };
    delete newMessages[threadId];
    chatState$.messages.set(newMessages);

    if (chatState$.activeThreadId.peek() === threadId) {
      const remaining = Object.keys(newThreads);
      chatState$.activeThreadId.set(remaining[0] || null);
    }

    await chatPersistence.deleteThread(threadId);
  },

  // Context management (for WP 7.6)
  addToContext: async (nodeId: string) => {
    const threadId = chatState$.activeThreadId.peek();
    if (!threadId) return;

    const threads = chatState$.threads.peek();
    const thread = threads[threadId];
    if (!thread) return;

    const current = thread.contextNodeIds || [];
    if (!current.includes(nodeId)) {
      const updatedThread: ChatThread = {
        ...thread,
        contextNodeIds: [...current, nodeId],
        updatedAt: new Date().toISOString(),
      };
      chatState$.threads.set({ ...threads, [threadId]: updatedThread });
      await chatPersistence.saveThread(updatedThread);
    }
  },

  removeFromContext: async (nodeId: string) => {
    const threadId = chatState$.activeThreadId.peek();
    if (!threadId) return;

    const threads = chatState$.threads.peek();
    const thread = threads[threadId];
    if (!thread) return;

    const current = thread.contextNodeIds || [];
    const updatedThread: ChatThread = {
      ...thread,
      contextNodeIds: current.filter((id) => id !== nodeId),
      updatedAt: new Date().toISOString(),
    };
    chatState$.threads.set({ ...threads, [threadId]: updatedThread });
    await chatPersistence.saveThread(updatedThread);
  },

  // Message management
  addMessage: async (
    message: Omit<ChatMessage, 'id' | 'createdAt'>
  ): Promise<string> => {
    const threadId = message.threadId;
    const fullMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    const messages = chatState$.messages.peek();
    const current = messages[threadId] || [];
    chatState$.messages.set({ ...messages, [threadId]: [...current, fullMessage] });

    const threads = chatState$.threads.peek();
    const thread = threads[threadId];
    if (thread) {
      const updatedThread: ChatThread = {
        ...thread,
        updatedAt: new Date().toISOString(),
      };
      chatState$.threads.set({ ...threads, [threadId]: updatedThread });
      await chatPersistence.saveThread(updatedThread);
    }

    // Persist message
    await chatPersistence.saveMessage(fullMessage);

    return fullMessage.id;
  },

  // Send message (placeholder for WP 7.3 AI integration)
  sendMessage: async (content: string) => {
    const threadId = chatState$.activeThreadId.peek();
    if (!threadId || !content.trim()) return;

    // Add user message
    await chatActions.addMessage({
      threadId,
      role: 'user',
      content: content.trim(),
    });

    // TODO WP 7.3: Call AI service here
    // For now, just add a placeholder assistant response
    chatState$.isLoading.set(true);

    setTimeout(async () => {
      await chatActions.addMessage({
        threadId,
        role: 'assistant',
        content: 'AI response will be implemented in WP 7.3',
      });
      chatState$.isLoading.set(false);
    }, 500);
  },

  // Streaming support (for WP 7.3)
  setStreaming: (content: string | null) => {
    chatState$.streamingContent.set(content);
  },

  setLoading: (loading: boolean) => {
    chatState$.isLoading.set(loading);
  },

  // Load threads from IndexedDB on app init
  loadThreads: async () => {
    const threads = await chatPersistence.loadAllThreads();
    const allMessages = await chatPersistence.loadAllMessages();

    // Group messages by thread
    const messagesByThread: Record<string, ChatMessage[]> = {};
    for (const msg of allMessages) {
      const threadMessages = messagesByThread[msg.threadId];
      if (threadMessages) {
        threadMessages.push(msg);
      } else {
        messagesByThread[msg.threadId] = [msg];
      }
    }

    // Sort messages by createdAt
    for (const threadId of Object.keys(messagesByThread)) {
      const threadMessages = messagesByThread[threadId];
      if (threadMessages) {
        threadMessages.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
    }

    // Update state
    const threadsMap: Record<string, ChatThread> = {};
    for (const thread of threads) {
      threadsMap[thread.id] = thread;
    }

    chatState$.threads.set(threadsMap);
    chatState$.messages.set(messagesByThread);

    // Set most recent thread as active
    if (threads.length > 0) {
      const sorted = [...threads].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      const mostRecent = sorted[0];
      if (mostRecent) {
        chatState$.activeThreadId.set(mostRecent.id);
      }
    }
  },

  // Update thread title
  updateThreadTitle: async (threadId: string, title: string) => {
    const threads = chatState$.threads.peek();
    const thread = threads[threadId];
    if (!thread) return;

    const updatedThread: ChatThread = {
      ...thread,
      title,
      updatedAt: new Date().toISOString(),
    };
    chatState$.threads.set({ ...threads, [threadId]: updatedThread });
    await chatPersistence.saveThread(updatedThread);
  },

  // Update proposal status (WP 7.5)
  updateProposalStatus: async (
    messageId: string,
    proposalId: string,
    status: 'pending' | 'accepted' | 'rejected'
  ) => {
    const messages = chatState$.messages.peek();

    // Find the thread containing this message
    for (const threadId of Object.keys(messages)) {
      const threadMessages = messages[threadId];
      if (!threadMessages) continue;

      const messageIndex = threadMessages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) continue;

      const message = threadMessages[messageIndex];
      if (!message?.proposals) continue;

      // Find and update the proposal status
      let updated = false;
      const updatedProposals = {
        nodes: message.proposals.nodes.map((n) => {
          if (n.id === proposalId) {
            updated = true;
            return { ...n, status };
          }
          return n;
        }),
        edges: message.proposals.edges.map((e) => {
          if (e.id === proposalId) {
            updated = true;
            return { ...e, status };
          }
          return e;
        }),
      };

      if (updated) {
        const updatedMessage: ChatMessage = {
          ...message,
          proposals: updatedProposals,
        };

        const updatedMessages = [...threadMessages];
        updatedMessages[messageIndex] = updatedMessage;
        chatState$.messages.set({ ...messages, [threadId]: updatedMessages });

        // Persist to IndexedDB
        await chatPersistence.saveMessage(updatedMessage);
      }

      return;
    }
  },
};

// Export for console debugging
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ATHENA_CHAT__ = {
    ...chatActions,
    chatState$,
  };
}
