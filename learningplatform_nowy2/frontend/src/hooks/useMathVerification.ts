import useApi from './useApi';

export const useMathVerification = (quizId: string) => {
  const api = useApi();

  const verifyMathExpression = async (expr1: string, expr2: string): Promise<boolean> => {
    try {
      const response = await api.post<{ data: { is_equivalent: boolean } }>(`/api/quizzes/${quizId}/verify_math_expression/`, {
        expression1: expr1,
        expression2: expr2,
      });
      return response.data.is_equivalent;
    } catch (error) {
      console.error('Error verifying math expression:', error);
      return false;
    }
  };

  return { verifyMathExpression };
};
