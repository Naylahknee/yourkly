/**
 * Canonical Yourkly language rules.
 * Product UI uses the plain-language term first. Git/GitHub vocabulary is
 * optional explanatory metadata, never required to complete a normal task.
 */
export const YOURKLY_TERMS = Object.freeze({
  repository: { label: 'Project', github: 'repository', help: 'The project itself: its files plus the history of how they changed.' },
  commit: { label: 'Save Point', github: 'commit', help: 'A saved version of your project at a particular moment.' },
  branch: { label: 'Version in progress', github: 'branch', help: 'A separate version being worked on without changing the main version yet.' },
  pullRequest: { label: 'Proposed changes', github: 'pull request', help: 'Changes waiting to be reviewed or added to the main version.' },
  merge: { label: 'Add these changes', github: 'merge', help: 'Bring proposed changes into the main version.' },
  readme: { label: 'About this project', github: 'README', help: 'A page that explains what the project is and how it is used.' },
  gitignore: { label: 'Files Yourkly should ignore', github: '.gitignore', help: 'A behind-the-scenes list of files that should not be included in version history.' },
  license: { label: 'How others can use this project', github: 'license', help: 'Rules that explain what other people are allowed to do with the project.' },
  visibility: { label: 'Who can see this project?', github: 'visibility' },
  private: { label: 'Only me / people I invite', github: 'private repository' },
  public: { label: 'Anyone', github: 'public repository' },
})

export function githubTerm(key){ return YOURKLY_TERMS[key]?.github || '' }
export function yourklyTerm(key){ return YOURKLY_TERMS[key]?.label || key }
