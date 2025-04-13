
// Resume parsing utility functions

export const extractLinkedInUrl = (text: string): string | null => {
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+(?:\/)?/i;
  const match = text.match(linkedinRegex);
  return match ? match[0] : null;
};

export const extractSkills = (text: string): string[] => {
  const skillKeywords = [
    'javascript', 'python', 'react', 'node', 'html', 'css', 'sql', 'java', 'c\\+\\+',
    'leadership', 'management', 'communication', 'teamwork', 'problem solving',
    'analytics', 'excel', 'powerpoint', 'project management', 'public speaking',
    'research', 'design', 'photoshop', 'illustrator', 'agile', 'scrum'
  ];
  return skillKeywords.filter(skill => 
    new RegExp(`\\b${skill}\\b`, 'i').test(text)
  );
};

export const extractInterests = (text: string): string[] => {
  const interestKeywords = [
    'travel', 'music', 'sports', 'reading', 'photography', 'cooking', 'gaming', 'hiking',
    'yoga', 'meditation', 'art', 'dancing', 'volunteering', 'cycling', 'running',
    'swimming', 'chess', 'writing', 'blogging', 'podcasting', 'movies', 'theater'
  ];
  return interestKeywords.filter(interest => 
    new RegExp(`\\b${interest}\\b`, 'i').test(text)
  );
};

export const extractParagraph = (text: string, maxWords: number): string => {
  const words = text.split(/\s+/).slice(0, maxWords);
  return words.join(' ');
};
