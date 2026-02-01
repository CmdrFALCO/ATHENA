import type { KnowledgeSchema } from '../types';

export const BUILT_IN_SCHEMAS: Omit<KnowledgeSchema, 'createdAt' | 'usageCount'>[] = [
  {
    id: 'research-project',
    name: 'Research Project',
    description: 'For academic research, literature reviews, and experiments',
    isBuiltIn: true,
    noteTypes: [
      { name: 'Paper', icon: 'file-text', description: 'Academic paper or article' },
      { name: 'Concept', icon: 'lightbulb', description: 'Key idea or theory' },
      { name: 'Method', icon: 'flask', description: 'Research methodology' },
      { name: 'Finding', icon: 'check-circle', description: 'Research result or conclusion' },
      { name: 'Question', icon: 'help-circle', description: 'Open research question' },
      { name: 'Dataset', icon: 'database', description: 'Data source used' },
    ],
    connectionTypes: [
      { label: 'CITES', sourceTypes: ['Paper'], targetTypes: ['Paper'], description: 'Paper cites another paper' },
      { label: 'USES_METHOD', sourceTypes: ['Paper'], targetTypes: ['Method'] },
      { label: 'SUPPORTS', targetTypes: ['Finding', 'Concept'], description: 'Evidence supports claim' },
      { label: 'CONTRADICTS', targetTypes: ['Finding', 'Concept'], description: 'Evidence contradicts claim' },
      { label: 'ADDRESSES', sourceTypes: ['Paper', 'Finding'], targetTypes: ['Question'] },
      { label: 'BUILDS_ON', description: 'Extends previous work' },
    ],
    extractionHints: [
      'Focus on methodology, findings, and citations',
      'Distinguish between claims and supporting evidence',
      'Note limitations and future work as Questions',
      'Capture key statistics and sample sizes in Findings',
    ],
  },

  {
    id: 'book-notes',
    name: 'Book Notes',
    description: 'For reading notes, quotes, and reflections',
    isBuiltIn: true,
    noteTypes: [
      { name: 'Book', icon: 'book', description: 'The book itself' },
      { name: 'Chapter', icon: 'bookmark', description: 'Book chapter or section' },
      { name: 'Quote', icon: 'quote', description: 'Direct quotation' },
      { name: 'Insight', icon: 'zap', description: 'Personal realization or takeaway' },
      { name: 'Character', icon: 'user', description: 'Person in the book (fiction or non-fiction)' },
      { name: 'Theme', icon: 'tag', description: 'Recurring theme or motif' },
    ],
    connectionTypes: [
      { label: 'FROM_BOOK', targetTypes: ['Book'], description: 'Content comes from this book' },
      { label: 'IN_CHAPTER', targetTypes: ['Chapter'] },
      { label: 'ILLUSTRATES', sourceTypes: ['Quote'], targetTypes: ['Theme', 'Insight'] },
      { label: 'RELATES_TO', description: 'General relationship between concepts' },
      { label: 'REMINDS_ME_OF', description: 'Personal connection to other knowledge' },
    ],
    extractionHints: [
      'Capture memorable quotes with page numbers when available',
      'Identify recurring themes across chapters',
      'Separate personal reflections (Insights) from author claims',
      'Note connections to other books or ideas',
    ],
  },

  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'For meetings, decisions, and action items',
    isBuiltIn: true,
    noteTypes: [
      { name: 'Meeting', icon: 'users', description: 'The meeting event' },
      { name: 'Decision', icon: 'check-square', description: 'Decision made in meeting' },
      { name: 'Action Item', icon: 'circle', description: 'Task to be completed' },
      { name: 'Person', icon: 'user', description: 'Meeting participant' },
      { name: 'Topic', icon: 'message-square', description: 'Discussion topic' },
      { name: 'Blocker', icon: 'alert-triangle', description: 'Issue blocking progress' },
    ],
    connectionTypes: [
      { label: 'ATTENDED', sourceTypes: ['Person'], targetTypes: ['Meeting'] },
      { label: 'DECIDED', sourceTypes: ['Meeting'], targetTypes: ['Decision'] },
      { label: 'ASSIGNED_TO', sourceTypes: ['Action Item'], targetTypes: ['Person'] },
      { label: 'DISCUSSED', sourceTypes: ['Meeting'], targetTypes: ['Topic'] },
      { label: 'BLOCKED_BY', sourceTypes: ['Action Item'], targetTypes: ['Blocker', 'Action Item'] },
      { label: 'DUE_BY', description: 'Deadline relationship' },
    ],
    extractionHints: [
      'Identify an owner for each action item',
      'Note deadlines explicitly when mentioned',
      'Distinguish final decisions from ongoing discussions',
      'Capture blockers and dependencies between tasks',
    ],
  },

  {
    id: 'general',
    name: 'General Knowledge',
    description: 'Flexible schema for general note-taking',
    isBuiltIn: true,
    noteTypes: [
      { name: 'Note', icon: 'file', description: 'General note' },
      { name: 'Concept', icon: 'lightbulb', description: 'Idea or concept' },
      { name: 'Person', icon: 'user', description: 'Person' },
      { name: 'Project', icon: 'folder', description: 'Project or initiative' },
      { name: 'Resource', icon: 'link', description: 'External resource' },
    ],
    connectionTypes: [
      { label: 'RELATES_TO', description: 'General relationship' },
      { label: 'PART_OF', description: 'Hierarchical relationship' },
      { label: 'REFERENCES', description: 'References another item' },
      { label: 'CREATED_BY', targetTypes: ['Person'] },
    ],
    extractionHints: [
      'Use the most specific type that fits',
      'Prefer explicit relationships over vague ones',
      'Capture the "why" behind connections',
    ],
  },
];
