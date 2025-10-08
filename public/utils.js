// DSA Implementation: Priority Queue (Max Heap) for tutor matching
export class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  // Add a tutor with a priority (match score)
  enqueue(item, priority) {
    const node = { item, priority };
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  // Remove and return the tutor with highest priority
  dequeue() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop().item;

    const max = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return max.item;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].priority <= this.heap[parentIndex].priority) break;

      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  bubbleDown(index) {
    while (true) {
      let largest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < this.heap.length &&
        this.heap[leftChild].priority > this.heap[largest].priority) {
        largest = leftChild;
      }

      if (rightChild < this.heap.length &&
        this.heap[rightChild].priority > this.heap[largest].priority) {
        largest = rightChild;
      }

      if (largest === index) break;

      [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
      index = largest;
    }
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap.length > 0 ? this.heap[0].item : null;
  }
}

// DSA Implementation: Sliding window for active users calculation
export function countActiveUsersLastNDays(users, days = 7) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  let activeCount = 0;

  for (const user of users) {
    if (user.lastActive && user.lastActive.toDate) {
      const lastActive = user.lastActive.toDate();
      if (lastActive >= windowStart && lastActive <= now) {
        activeCount++;
      }
    }
  }

  return activeCount;
}

// DSA Implementation: BFS for referral network analysis
export function analyzeReferralNetworkBFS(referrals, startUserId) {
  const graph = new Map();

  for (const ref of referrals) {
    if (!graph.has(ref.userId)) {
      graph.set(ref.userId, []);
    }
    graph.get(ref.userId).push(ref.referredUserId);
  }

  const queue = [{ userId: startUserId, level: 0 }];
  const visited = new Set([startUserId]);
  const levels = new Map();
  let maxDepth = 0;

  while (queue.length > 0) {
    const { userId, level } = queue.shift();
    maxDepth = Math.max(maxDepth, level);

    if (!levels.has(level)) {
      levels.set(level, 0);
    }
    levels.set(level, levels.get(level) + 1);

    if (graph.has(userId)) {
      for (const referredUser of graph.get(userId)) {
        if (!visited.has(referredUser)) {
          visited.add(referredUser);
          queue.push({ userId: referredUser, level: level + 1 });
        }
      }
    }
  }

  return {
    totalReferrals: visited.size - 1,
    maxDepth,
    levelDistribution: Object.fromEntries(levels)
  };
}

// DSA Implementation: DFS for referral network path finding
export function findReferralPathDFS(referrals, startUserId, targetUserId) {
  const graph = new Map();

  for (const ref of referrals) {
    if (!graph.has(ref.userId)) {
      graph.set(ref.userId, []);
    }
    graph.get(ref.userId).push(ref.referredUserId);
  }

  const visited = new Set();
  const path = [];

  function dfs(currentUserId) {
    if (currentUserId === targetUserId) {
      path.push(currentUserId);
      return true;
    }

    visited.add(currentUserId);
    path.push(currentUserId);

    if (graph.has(currentUserId)) {
      for (const nextUser of graph.get(currentUserId)) {
        if (!visited.has(nextUser)) {
          if (dfs(nextUser)) {
            return true;
          }
        }
      }
    }

    path.pop();
    return false;
  }

  dfs(startUserId);
  return path;
}

// Matching Algorithm: Calculate tutor compatibility score
export function calculateCompatibilityScore(tutor, learner) {
  let score = 0;

  const tutorSubjects = Array.isArray(tutor.subjects) ? tutor.subjects : [];
  const learnerSubjects = Array.isArray(learner.subjects) ? learner.subjects : [];

  const subjectMatch = tutorSubjects.some(subject =>
    learnerSubjects.includes(subject)
  );
  if (subjectMatch) {
    score += 50;
  }

  const tutorAvailability = Array.isArray(tutor.availability) ? tutor.availability : [];
  const learnerAvailability = Array.isArray(learner.availability) ? learner.availability : [];

  const availabilityMatch = tutorAvailability.some(slot =>
    learnerAvailability.includes(slot)
  );
  if (availabilityMatch) {
    score += 30;
  }

  const rating = tutor.rating || 0;
  score += Math.min(rating * 4, 20);

  return score;
}
