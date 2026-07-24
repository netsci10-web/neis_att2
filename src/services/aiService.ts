export const callGeminiApi = async (prompt: string, systemInstruction = ""): Promise<string> => {
  const customApiKey = localStorage.getItem('gemini_api_key') || "";
  
  const response = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      systemInstruction,
      customApiKey: customApiKey || undefined
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "AI 호출 중 오류가 발생했습니다.");
  }

  const result = await response.json();
  return result.text || "";
};
