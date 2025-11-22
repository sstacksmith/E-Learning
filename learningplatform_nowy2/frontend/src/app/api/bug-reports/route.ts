import { NextRequest, NextResponse } from 'next/server';

// Funkcja do określenia URL backendu
function getBackendUrl(): string {
  // Najpierw sprawdź zmienną środowiskową
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Sprawdź czy jesteśmy na Vercel (produkcja)
  if (process.env.VERCEL || process.env.VERCEL_ENV === 'production') {
    return 'https://cogito-7zrt.onrender.com';
  }
  
  // Sprawdź NODE_ENV jako fallback
  if (process.env.NODE_ENV === 'production') {
    return 'https://cogito-7zrt.onrender.com';
  }
  
  // Domyślnie localhost dla development
  return 'http://localhost:8000';
}

const BACKEND_URL = getBackendUrl();

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    // Logowanie dla debugowania - szczególnie ważne na produkcji
    console.log('🔍 Bug reports API route called');
    console.log('🔍 Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    });
    console.log('🔍 Authorization header present:', !!authHeader);
    if (authHeader) {
      // Pokaż tylko początek tokenu dla bezpieczeństwa
      const tokenPreview = authHeader.substring(0, 20) + '...';
      console.log('🔍 Token preview:', tokenPreview);
    }
    console.log('🔍 Backend URL:', BACKEND_URL);
    
    // Przekaż parametry query do backendu
    const queryString = searchParams.toString();
    // WAŻNE: Django wymaga trailing slash!
    const url = `${BACKEND_URL}/api/bug-reports/${queryString ? `?${queryString}` : ''}`;
    
    console.log('🔍 Fetching from backend URL:', url);
    
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      // Dodaj timeout dla produkcji
      signal: AbortSignal.timeout(30000), // 30 sekund timeout
    };
    
    const response = await fetch(url, fetchOptions);

    console.log('🔍 Backend response status:', response.status);
    console.log('🔍 Backend response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Failed to fetch bug reports' };
      }
      
      console.error('❌ Backend error data:', errorData);
      
      // Dodaj więcej informacji diagnostycznych
      return NextResponse.json(
        {
          ...errorData,
          _debug: {
            backendUrl: BACKEND_URL,
            requestUrl: url,
            status: response.status,
            hasAuthHeader: !!authHeader,
          }
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Bug reports fetched successfully, count:', data.count || 0);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error fetching bug reports:', error);
    
    // Sprawdź czy to timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout - backend nie odpowiada', details: error.message },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        _debug: {
          backendUrl: BACKEND_URL,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        }
      },
      { status: 500 }
    );
  }
}

