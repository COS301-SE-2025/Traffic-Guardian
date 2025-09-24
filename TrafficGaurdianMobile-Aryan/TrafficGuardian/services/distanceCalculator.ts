export function calculateDistance(pointA: number[], pointB: number[]): string {
  if (pointA.length !== 2 || pointB.length !== 2) {
        return "Invalid coordinates";
    }

  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const [lat1, lon1] = pointA;
  const [lat2, lon2] = pointB;

  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // distance in meters
  return `${distance}m away`;
}
