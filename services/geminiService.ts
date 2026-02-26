import { GoogleGenAI } from "@google/genai";
import { StarData } from "../types";

// Initialize Gemini Client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// Updated System Instruction based on user request
const SYSTEM_INSTRUCTION = `
# Role
당신은 'Curiostar'의 지식 큐레이션 AI입니다.
사용자의 질문에 대해 가장 핵심적인 통찰을 **간결하고 명료하게** 요약하는 것이 당신의 목표입니다.

# Tone & Manner
- **Minimalist & Dry:** 감정적이거나 문학적인 수식어를 배제하세요.
- **Analytical:** 현상에 대한 단순 나열보다, 그것이 왜 중요한지 '본질'을 짚어주세요.
- **Polite but Firm:** 정중하되, 말끝을 늘리지 말고 단호하게 끝맺으세요.

# Constraints (Must Follow)
1. **필수 - 최신 정보 검색:** 질문이 '누구', '현재', '최근', '환율', '날씨', '대통령' 등 시의성이 필요하거나 사실 관계 확인이 필요한 경우, **반드시 제공된 Google Search 도구**를 사용하여 최신 정보를 검색한 뒤 답변하십시오. 절대 당신의 학습 데이터에만 의존하여 과거 정보를 사실인 것처럼 말하지 마십시오.
2. **길이 제한:** 답변은 공백 포함 **150자 이내**로 작성하세요. 매우 짧고 굵게 핵심만 전달해야 합니다.
3. **형식:** 중요한 키워드는 마크다운 볼드체(\`**강조**\`)를 사용하여 가독성을 높이세요.
`;

const FALLBACK_ANSWERS = [
  "**데이터 연결 실패.**\n현재 우주 통신망(API Key)에 접근할 수 없습니다. 연결 상태를 확인해주십시오.",
  "**신호 미약.**\n질문의 본질을 파악하고 있으나, 일시적인 네트워크 간섭이 발생했습니다. 잠시 후 다시 시도하십시오.",
];

/**
 * Streams the response from Gemini with Google Search Grounding
 */
export const streamStarResponse = async (
  question: string, 
  onChunk: (text: string) => void
): Promise<string> => {
  const ai = getClient();
  
  if (!ai) {
    console.warn("No API Key found. Using fallback simulation.");
    return simulateStreaming(FALLBACK_ANSWERS[0], onChunk);
  }

  try {
    const model = 'gemini-3-flash-preview'; 
    
    // Enable Google Search Tool
    const result = await ai.models.generateContentStream({
      model: model,
      contents: [{ role: 'user', parts: [{ text: question }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }], // Grounding enabled
      }
    });

    let fullText = '';
    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(fullText);
      }
    }
    return fullText;

  } catch (error) {
    console.error("Gemini Streaming Error:", error);
    return simulateStreaming(FALLBACK_ANSWERS[1], onChunk);
  }
};

const simulateStreaming = (text: string, onChunk: (text: string) => void): Promise<string> => {
  return new Promise((resolve) => {
    let currentText = "";
    let i = 0;
    const interval = setInterval(() => {
      currentText += text.charAt(i);
      onChunk(currentText);
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        resolve(text);
      }
    }, 30);
  });
};

/**
 * Simulates high-dimensional vector analysis mapping to 3D space.
 * Includes repulsion logic: if stars are too close, expand spacing by 15%.
 */
export const calculateStarPosition = async (
    text: string, 
    isNew: boolean = false, 
    existingStars: StarData[] = []
): Promise<{x: number, y: number, z: number}> => {
  
  if (isNew && text.length === 0) return { x: 0, y: 0, z: 0 }; 

  // 1. Simulate "768 Axis Analysis" via Content Hashing
  // We generate 3 floats from the text hash to simulate dimensionality reduction (e.g., PCA/t-SNE result)
  let h1 = 0x811c9dc5, h2 = 0xc9dc5811, h3 = 0x5811c9dc;
  
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 ^= c; h1 = Math.imul(h1, 0x01000193);
    h2 ^= c; h2 = Math.imul(h2, 0x10001931);
    h3 ^= c; h3 = Math.imul(h3, 0x00193101);
  }

  // Normalize to -1.0 ~ 1.0 range
  const n1 = (h1 >>> 0) / 4294967296 * 2 - 1;
  const n2 = (h2 >>> 0) / 4294967296 * 2 - 1;
  const n3 = (h3 >>> 0) / 4294967296 * 2 - 1;

  // Scale to Universe bounds (approx -60 to 60)
  const SCALE = 60;
  let pos = {
      x: n1 * SCALE,
      y: n2 * SCALE * 0.6, // Flatten Y slightly for aesthetics
      z: n3 * SCALE
  };

  // 2. Repulsion Logic (Expand spacing by 15%)
  // If the calculated position is too close to any existing star, push it away.
  // We iterate a few times to settle the position.
  const MIN_DISTANCE = 4.0;
  const EXPANSION_FACTOR = 1.15; // 15% expansion
  const MAX_ITERATIONS = 5;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
      let tooClose = false;
      
      for (const star of existingStars) {
          const dx = pos.x - star.position.x;
          const dy = pos.y - star.position.y;
          const dz = pos.z - star.position.z;
          const distSq = dx*dx + dy*dy + dz*dz;

          if (distSq < MIN_DISTANCE * MIN_DISTANCE) {
              tooClose = true;
              break;
          }
      }

      if (tooClose) {
          // Push outward from center (0,0,0) by 15%
          pos.x *= EXPANSION_FACTOR;
          pos.y *= EXPANSION_FACTOR;
          pos.z *= EXPANSION_FACTOR;
      } else {
          break; // Position is clear
      }
  }

  return pos;
};