"""
Enhanced Law Library API Endpoints
Add these endpoints to your main.py file
"""

# Add this import at the top of main.py:
# from law_library_enhanced import get_enhanced_law_library

@app.get("/api/law-library/categories")
async def get_law_categories():
    """Get all law categories"""
    try:
        library = get_enhanced_law_library()
        categories = library.get_all_categories()
        return {"success": True, "categories": categories}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/law-library/category/{category_id}")
async def get_category_details(category_id: str):
    """Get details of a specific category"""
    try:
        library = get_enhanced_law_library()
        details = library.get_category_details(category_id)
        
        if details is None:
            return {"success": False, "error": "Category not found"}
        
        return {"success": True, "category": details}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/law-library/sections/{category_id}")
async def get_category_sections_paginated(
    category_id: str, 
    page: int = 1, 
    page_size: int = 50
):
    """Get sections in a category with pagination - OPTIMIZED"""
    try:
        library = get_enhanced_law_library()
        result = library.get_sections_paginated(category_id, page, page_size)
        
        if 'error' in result:
            return {"success": False, "error": result['error']}
        
        return {"success": True, **result}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/law-library/chapter/{category_id}")
async def get_chapter_sections(category_id: str, chapter_range: str):
    """Get sections within a specific chapter range"""
    try:
        library = get_enhanced_law_library()
        result = library.get_chapter_sections(category_id, chapter_range)
        
        if 'error' in result:
            return {"success": False, "error": result['error']}
        
        return {"success": True, **result}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/law-library/search")
async def search_law_sections_fast(
    query: str, 
    category: Optional[str] = None, 
    page: int = 1,
    page_size: int = 20
):
    """Search law sections - OPTIMIZED with pagination"""
    try:
        library = get_enhanced_law_library()
        result = library.search_sections_fast(query, category, page, page_size)
        
        if 'error' in result:
            return {"success": False, "error": result['error']}
        
        return {"success": True, **result}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/law-library/section/{section_number}")
async def get_section_by_number_fast(section_number: str, category: Optional[str] = None):
    """Get a specific section by number - OPTIMIZED"""
    try:
        library = get_enhanced_law_library()
        section = library.get_section_by_number_fast(section_number, category)
        
        if section is None:
            return {"success": False, "error": "Section not found"}
        
        return {"success": True, "section": section}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/law-library/popular")
async def get_popular_sections_fast(category: Optional[str] = None, limit: int = 10):
    """Get popular/most searched sections - OPTIMIZED"""
    try:
        library = get_enhanced_law_library()
        sections = library.get_popular_sections(category, limit)
        
        return {
            "success": True,
            "category": category,
            "total": len(sections),
            "sections": sections
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/law-library/statistics")
async def get_library_statistics():
    """Get law library statistics"""
    try:
        library = get_enhanced_law_library()
        stats = library.get_statistics()
        
        return {"success": True, "statistics": stats}
    except Exception as e:
        return {"success": False, "error": str(e)}
