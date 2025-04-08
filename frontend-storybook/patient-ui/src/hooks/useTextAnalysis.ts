import { useQuery } from '@tanstack/react-query';
import { textAnalysisService } from '../services/textAnalysisService';
import { AnalysisResult, StructuredData } from '../types/textAnalysis';

// Define SuggestionsResponse type if not already defined elsewhere
interface SuggestionsResponse {
  suggestions: string[];
}

export type { AnalysisResult, StructuredData, SuggestionsResponse };

interface UseTextAnalysisOptions {
  text?: string;
  analysisEnabled?: boolean;
  structuredEnabled?: boolean;
  suggestionsEnabled?: boolean;
}

export const useTextAnalysis = ({
  text,
  analysisEnabled = false,
  structuredEnabled = false,
  suggestionsEnabled = false,
}: UseTextAnalysisOptions) => {
  
  // Query for text analysis (entities, key phrases, sentiment)
  const useAnalysis = () => {
    return useQuery<AnalysisResult, Error>({
      queryKey: ['textAnalysis', text],
      queryFn: () => textAnalysisService.analyze(text!),
      enabled: !!text && analysisEnabled,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Query for structured data
  const useStructuredData = () => {
    return useQuery<StructuredData, Error>({
      queryKey: ['structuredData', text],
      queryFn: () => textAnalysisService.extractStructuredData(text!),
      enabled: !!text && structuredEnabled,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Query for suggestions
  const useSuggestions = () => {
    return useQuery<string[], Error>({
      queryKey: ['suggestions', text],
      queryFn: () => textAnalysisService.getSuggestions(text!),
      enabled: !!text && suggestionsEnabled,
      staleTime: 5 * 60 * 1000,
    });
  };

  return {
    useAnalysis,
    useStructuredData,
    useSuggestions,
  };
};

export default useTextAnalysis; 