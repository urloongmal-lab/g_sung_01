import { StarData } from '../types';

const TOPICS = ['Science', 'Philosophy', 'Art', 'History', 'Technology', 'Cosmos', 'Ethics', 'Quantum', 'Nature', 'Mind'];

// Pre-define random centers for each topic to create semantic clusters
// This simulates "Topic Modeling" in 3D space.
const TOPIC_CENTERS: Record<string, {x: number, y: number, z: number}> = {};

TOPICS.forEach(topic => {
    // Generate a random center for this topic within the universe bounds
    // Range: -50 to 50
    TOPIC_CENTERS[topic] = {
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 60,  // Slightly flatter Y
        z: (Math.random() - 0.5) * 100
    };
});

export const generateMockStars = (count: number): StarData[] => {
  return Array.from({ length: count }).map((_, i) => {
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const center = TOPIC_CENTERS[topic];
    
    // CLUSTER ALGORITHM (Not Spiral)
    // Distribute stars around their topic center using Gaussian-like distribution
    // This creates "blobs" of knowledge, simulating semantic similarity.
    
    const spread = 15; // How spread out the topic cluster is
    
    const x = center.x + (Math.random() - 0.5) * spread;
    const y = center.y + (Math.random() - 0.5) * spread;
    const z = center.z + (Math.random() - 0.5) * spread;

    // Calculate simulated similarity score based on closeness to center of the universe
    const distFromCenter = Math.sqrt(x*x + y*y + z*z);
    const similarityScore = Math.max(0, 1 - (distFromCenter / 60));

    return {
      id: `mock-${i}`,
      content: `What is the essence of ${topic.toLowerCase()}?`,
      answer: `The essence of ${topic.toLowerCase()} lies in its ability to reflect the human condition through the lens of time and space. It is a star in the constellation of human knowledge.`,
      topic: topic,
      position: { x, y, z },
      createdAt: new Date().toISOString(),
      similarityScore: similarityScore
    };
  });
};