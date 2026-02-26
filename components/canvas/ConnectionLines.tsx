import React, { useMemo } from 'react';
import { StarData } from '../../types';
import * as THREE from 'three';

interface ConnectionLinesProps {
  selectedStar: StarData | null;
  allStars: StarData[];
}

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({ selectedStar, allStars }) => {
  const geometry = useMemo(() => {
    if (!selectedStar) return null;

    const others = allStars.filter(s => s.id !== selectedStar.id);
    const sameTopic = others.filter(s => s.topic && selectedStar.topic && s.topic === selectedStar.topic);

    const origin = new THREE.Vector3(selectedStar.position.x, selectedStar.position.y, selectedStar.position.z);
    let neighbors: StarData[] = [];

    // Prioritize same topic, otherwise closest distance
    if (sameTopic.length > 0) {
       neighbors = sameTopic.sort((a, b) => {
        const distA = new THREE.Vector3(a.position.x, a.position.y, a.position.z).distanceTo(origin);
        const distB = new THREE.Vector3(b.position.x, b.position.y, b.position.z).distanceTo(origin);
        return distA - distB;
      }).slice(0, 3);
    } else {
      neighbors = others.map(s => ({
        star: s,
        dist: new THREE.Vector3(s.position.x, s.position.y, s.position.z).distanceTo(origin)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map(item => item.star);
    }

    if (neighbors.length === 0) return null;

    // Create flat array of vertex positions [x1,y1,z1, x2,y2,z2, ...] for LineSegments
    const points: number[] = [];
    neighbors.forEach(n => {
        points.push(origin.x, origin.y, origin.z);
        points.push(n.position.x, n.position.y, n.position.z);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, [selectedStar, allStars]);

  if (!selectedStar || !geometry) return null;

  return (
    <lineSegments geometry={geometry}>
      {/* Updated to Indigo-400 */}
      <lineBasicMaterial color="#818cf8" transparent opacity={0.6} depthWrite={false} />
    </lineSegments>
  );
};