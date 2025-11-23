/**
 * Law Library API Client
 * Handles all law library related API calls
 */

const API_BASE_URL = 'http://localhost:8000/api/law-library';

export interface LawCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  count: number;
  chapters: number;
}

export interface Chapter {
  title: string;
  range: string;
  description: string;
  popular?: boolean;
}

export interface LawSection {
  Section: string;
  Act: string;
  Title: string;
  Description: string;
  Punishment: string;
  Bailable: string;
  Cognizable: string;
  category?: string;
  category_id?: string;
  popular?: boolean;
  match_score?: number;
  matched_fields?: string[];
}

export interface CategoryDetails {
  id: string;
  name: string;
  description: string;
  chapters: Chapter[];
  total_sections: number;
  icon: string;
}

export interface SearchResult {
  query: string;
  category: string | null;
  total_results: number;
  results: LawSection[];
}

export interface Statistics {
  total_categories: number;
  total_sections: number;
  categories: {
    [key: string]: {
      name: string;
      count: number;
      chapters: number;
    };
  };
}

/**
 * Get all law categories
 */
export async function getCategories(): Promise<LawCategory[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/categories`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch categories');
    }
    
    return data.categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

/**
 * Get details of a specific category
 */
export async function getCategoryDetails(categoryId: string): Promise<CategoryDetails> {
  try {
    const response = await fetch(`${API_BASE_URL}/category/${categoryId}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch category details');
    }
    
    return data.category;
  } catch (error) {
    console.error('Error fetching category details:', error);
    throw error;
  }
}

/**
 * Get sections in a category with pagination
 */
export async function getCategorySections(
  categoryId: string,
  limit: number = 100,
  offset: number = 0
): Promise<{
  category: string;
  total: number;
  offset: number;
  limit: number;
  sections: LawSection[];
  has_more: boolean;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/sections/${categoryId}?limit=${limit}&offset=${offset}`
    );
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch sections');
    }
    
    return {
      category: data.category,
      total: data.total,
      offset: data.offset,
      limit: data.limit,
      sections: data.sections,
      has_more: data.has_more,
    };
  } catch (error) {
    console.error('Error fetching category sections:', error);
    throw error;
  }
}

/**
 * Get sections within a specific chapter range
 */
export async function getChapterSections(
  categoryId: string,
  chapterRange: string
): Promise<{
  chapter_range: string;
  total: number;
  sections: LawSection[];
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/chapter/${categoryId}?chapter_range=${encodeURIComponent(chapterRange)}`
    );
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch chapter sections');
    }
    
    return {
      chapter_range: data.chapter_range,
      total: data.total,
      sections: data.sections,
    };
  } catch (error) {
    console.error('Error fetching chapter sections:', error);
    throw error;
  }
}

/**
 * Search law sections
 */
export async function searchSections(
  query: string,
  category: string | null = null,
  limit: number = 20
): Promise<SearchResult> {
  try {
    const params = new URLSearchParams({ query, limit: limit.toString() });
    if (category) {
      params.append('category', category);
    }
    
    const response = await fetch(`${API_BASE_URL}/search?${params}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Search failed');
    }
    
    return {
      query: data.query,
      category: data.category,
      total_results: data.total_results,
      results: data.results,
    };
  } catch (error) {
    console.error('Error searching sections:', error);
    throw error;
  }
}

/**
 * Get a specific section by number
 */
export async function getSectionByNumber(
  sectionNumber: string,
  category: string | null = null
): Promise<LawSection> {
  try {
    const params = new URLSearchParams();
    if (category) {
      params.append('category', category);
    }
    
    const response = await fetch(
      `${API_BASE_URL}/section/${encodeURIComponent(sectionNumber)}?${params}`
    );
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Section not found');
    }
    
    return data.section;
  } catch (error) {
    console.error('Error fetching section:', error);
    throw error;
  }
}

/**
 * Get popular/most searched sections
 */
export async function getPopularSections(
  category: string | null = null,
  limit: number = 10
): Promise<LawSection[]> {
  try {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (category) {
      params.append('category', category);
    }
    
    const response = await fetch(`${API_BASE_URL}/popular?${params}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch popular sections');
    }
    
    return data.sections;
  } catch (error) {
    console.error('Error fetching popular sections:', error);
    throw error;
  }
}

/**
 * Get law library statistics
 */
export async function getStatistics(): Promise<Statistics> {
  try {
    const response = await fetch(`${API_BASE_URL}/statistics`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch statistics');
    }
    
    return data.statistics;
  } catch (error) {
    console.error('Error fetching statistics:', error);
    throw error;
  }
}

/**
 * Download section as PDF (placeholder - requires backend implementation)
 */
export async function downloadSectionPDF(section: LawSection): Promise<void> {
  // This would require a backend endpoint to generate PDFs
  console.log('Download PDF for section:', section.Section);
  // For now, create a simple text download
  const content = `
${section.Section} - ${section.Title}
Act: ${section.Act}

Description:
${section.Description}

Punishment:
${section.Punishment}

Bailable: ${section.Bailable}
Cognizable: ${section.Cognizable}
`;
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${section.Section.replace(/\s+/g, '_')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Share section (uses Web Share API if available)
 */
export async function shareSection(section: LawSection): Promise<void> {
  const shareData = {
    title: `${section.Section} - ${section.Title}`,
    text: `${section.Description}\n\nPunishment: ${section.Punishment}`,
    url: window.location.href,
  };
  
  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (error) {
      console.log('Error sharing:', error);
    }
  } else {
    // Fallback: copy to clipboard
    const text = `${shareData.title}\n\n${shareData.text}`;
    await navigator.clipboard.writeText(text);
    alert('Section details copied to clipboard!');
  }
}
