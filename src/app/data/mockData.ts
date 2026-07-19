import type {
  Submission,
  CollisionAlert,
  ActivityItem,
  Notification,
  ApprovedProject,
  Presentation,
  FeedbackItem,
} from "../types";

export const teacherProfile = {
  name: "Dr. Sarah Williams",
  department: "Computer Science",
  role: "Associate Professor",
  avatar: "SW",
};

export const submissions: Submission[] = [
  {
    id: "s1",
    student_name: "Emma Watson",
    student_avatar: "EW",
    department: "CS",
    project_title: "AI-Powered Crop Yield Prediction",
    abstract:
      "A machine learning system leveraging satellite imagery and IoT sensor data to predict crop yields with 94% accuracy. Uses ensemble models combining CNN and LSTM architectures for temporal-spatial analysis.",
    submission_date: "Jun 14, 2026",
    status: "pending",
    athena: {
      uniqueness_score: 92,
      ai_confidence: 87,
      historical_matches: [
        {
          project_title: "Smart Agriculture IoT",
          student_name: "John Smith",
          year: 2021,
          similarity: 8,
          preview: "IoT-based monitoring system for agricultural fields using sensor networks...",
        },
      ],
      active_collisions: [],
      ai_suggestion: "Approve — topic is fresh and includes novel methodology",
      suggested_differentiators: [],
      rejection_reasons: ["Topic too similar to existing project", "Low originality score"],
    },
  },
  {
    id: "s2",
    student_name: "Alex Chen",
    student_avatar: "AC",
    department: "CS",
    project_title: "Blockchain-Based Supply Chain Tracker",
    abstract:
      "Decentralized supply chain management platform using Hyperledger Fabric. Tracks product provenance from manufacturer to consumer with immutable audit trails and smart contract automation.",
    submission_date: "Jun 13, 2026",
    status: "pending",
    athena: {
      uniqueness_score: 78,
      ai_confidence: 72,
      historical_matches: [],
      active_collisions: [
        { student_name: "Maria Garcia", similarity: 78, project_title: "Distributed Ledger for Logistics" },
      ],
      ai_suggestion: "Review Carefully — high similarity with Maria Garcia's proposal",
      suggested_differentiators: [
        "Alex could focus on B2B enterprise integration",
        "Maria could pivot to consumer-facing traceability app",
      ],
      rejection_reasons: [
        "Topic too similar to 'Distributed Ledger for Logistics' by Maria Garcia",
        "Topic lacks originality (AI uniqueness score: 78%)",
      ],
    },
  },
  {
    id: "s3",
    student_name: "Maria Garcia",
    student_avatar: "MG",
    department: "CS",
    project_title: "Distributed Ledger for Logistics",
    abstract:
      "Blockchain solution for logistics companies to track shipments in real-time. Implements smart contracts for automated payment release upon delivery confirmation.",
    submission_date: "Jun 13, 2026",
    status: "pending",
    athena: {
      uniqueness_score: 76,
      ai_confidence: 74,
      historical_matches: [],
      active_collisions: [
        { student_name: "Alex Chen", similarity: 78, project_title: "Blockchain-Based Supply Chain Tracker" },
      ],
      ai_suggestion: "Review Carefully — collision detected with Alex Chen",
      suggested_differentiators: [
        "Focus on last-mile delivery optimization",
        "Add IoT integration for real-time GPS tracking",
      ],
      rejection_reasons: [
        "Topic too similar to 'Blockchain-Based Supply Chain Tracker' by Alex Chen",
        "Topic lacks originality (AI uniqueness score: 76%)",
      ],
    },
  },
  {
    id: "s4",
    student_name: "James Liu",
    student_avatar: "JL",
    department: "EE",
    project_title: "Neural Interface for Prosthetics",
    abstract:
      "Brain-computer interface system enabling intuitive control of prosthetic limbs through EEG signal processing. Novel signal filtering algorithm reduces latency to under 50ms.",
    submission_date: "Jun 12, 2026",
    status: "pending",
    athena: {
      uniqueness_score: 95,
      ai_confidence: 91,
      historical_matches: [],
      active_collisions: [],
      ai_suggestion: "Approve — highly unique with breakthrough latency improvements",
      suggested_differentiators: [],
      rejection_reasons: ["Topic already exists in archive from 2023"],
    },
  },
  {
    id: "s5",
    student_name: "Priya Sharma",
    student_avatar: "PS",
    department: "IT",
    project_title: "Telemedicine Platform for Rural Areas",
    abstract:
      "Low-bandwidth optimized telemedicine platform connecting rural patients with urban specialists. Features offline-first architecture and AI-assisted symptom triage.",
    submission_date: "Jun 11, 2026",
    status: "pending",
    athena: {
      uniqueness_score: 45,
      ai_confidence: 88,
      historical_matches: [
        {
          project_title: "Telemedicine Platforms",
          student_name: "John Smith",
          year: 2021,
          similarity: 72,
          preview: "Web-based telemedicine platform connecting patients with doctors remotely...",
        },
      ],
      active_collisions: [],
      ai_suggestion: "Reject — significant historical overlap detected",
      suggested_differentiators: ["Add blockchain for medical records", "Focus on specific disease vertical"],
      rejection_reasons: [
        "Topic too similar to 'Telemedicine Platforms' by John Smith (2021)",
        "Topic lacks originality (AI uniqueness score: 45%)",
        "Historical match found",
      ],
    },
  },
  {
    id: "s6",
    student_name: "Tom Bradley",
    student_avatar: "TB",
    department: "ME",
    project_title: "Autonomous Drone Swarm for Search & Rescue",
    abstract:
      "Coordinated drone swarm system for disaster response using distributed AI. Drones communicate via mesh network to cover large search areas efficiently.",
    submission_date: "Jun 10, 2026",
    status: "pending",
    athena: {
      uniqueness_score: 88,
      ai_confidence: 82,
      historical_matches: [],
      active_collisions: [],
      ai_suggestion: "Approve — innovative swarm coordination approach",
      suggested_differentiators: [],
      rejection_reasons: ["Topic too similar to existing project"],
    },
  },
];

export const collisionAlerts: CollisionAlert[] = [
  {
    id: "c1",
    students: [
      {
        name: "Alex Chen",
        avatar: "AC",
        project: "Blockchain-Based Supply Chain Tracker",
        abstract: "Decentralized supply chain management platform using Hyperledger Fabric...",
      },
      {
        name: "Maria Garcia",
        avatar: "MG",
        project: "Distributed Ledger for Logistics",
        abstract: "Blockchain solution for logistics companies to track shipments in real-time...",
      },
    ],
    similarity: 78,
    common_keywords: ["blockchain", "supply chain", "logistics", "smart contracts", "tracking"],
    ai_resolution: "Suggest merge into group project or require one student to pivot to B2C focus",
  },
];

export const activityFeed: ActivityItem[] = [
  { id: "a1", text: "Emma Watson submitted a new proposal", time: "2m ago", type: "submit", action: "Review" },
  { id: "a2", text: "Alex Chen revised his abstract after AI suggestions", time: "15m ago", type: "revise", action: "View" },
  { id: "a3", text: "Maria Garcia's project was flagged for similarity (72%)", time: "1h ago", type: "flag", action: "Compare" },
  { id: "a4", text: "James Liu's proposal approved by Dr. Williams", time: "3h ago", type: "approve" },
  { id: "a5", text: "Priya Sharma resubmitted after revision request", time: "5h ago", type: "revise", action: "Review" },
];

export const notifications: Notification[] = [
  { id: "n1", title: "AI finished analyzing 3 new submissions", description: "Athena completed analysis for Emma, Alex, and Maria", time: "2m ago", unread: true, type: "ai" },
  { id: "n2", title: "Student resubmitted after revision", description: "Priya Sharma updated her telemedicine proposal", time: "1h ago", unread: true, type: "submission" },
  { id: "n3", title: "Collision alert updated", description: "Alex Chen ↔ Maria Garcia similarity now 78%", time: "2h ago", unread: true, type: "collision" },
  { id: "n4", title: "Batch scan completed", description: "6 submissions analyzed — 2 collisions found", time: "4h ago", unread: false, type: "batch" },
];

export const approvedProjects: ApprovedProject[] = [
  { id: "p1", title: "AI for Crop Yield", student: "Sarah Chen", department: "CS", status: "approved", approved_by: "Prof. Johnson", approved_date: "Dec 5, 2024" },
  { id: "p2", title: "Smart City IoT Network", student: "Mike Johnson", department: "EE", status: "approved", approved_by: "Dr. Williams", approved_date: "Dec 3, 2024" },
  { id: "p3", title: "ML Fraud Detection", student: "Lisa Park", department: "CS", status: "pending" },
  { id: "p4", title: "Renewable Energy Grid", student: "David Kim", department: "ME", status: "in_progress" },
  { id: "p5", title: "Cybersecurity Framework", student: "Anna Lee", department: "IT", status: "approved", approved_by: "Prof. Kumar", approved_date: "Nov 28, 2024" },
  { id: "p6", title: "VR Training Simulator", student: "Chris Brown", department: "CS", status: "rejected" },
];

export const presentations: Presentation[] = [
  { id: "pr1", project: "AI-Powered Crop Yield", student: "Emma Watson", date: "Jun 18", time: "10:00 AM", room: "Hall A" },
  { id: "pr2", project: "Neural Interface Prosthetics", student: "James Liu", date: "Jun 19", time: "2:00 PM", room: "Lab 3" },
  { id: "pr3", project: "Drone Swarm Rescue", student: "Tom Bradley", date: "Jun 21", time: "11:00 AM", room: "Hall B" },
];

export const recentFeedback: FeedbackItem[] = [
  { id: "f1", student: "Emma Watson", project: "Crop Yield AI", text: "Excellent methodology. Consider adding comparison with traditional methods.", time: "2h ago" },
  { id: "f2", student: "James Liu", project: "Neural Interface", text: "Breakthrough latency results. Approved for presentation.", time: "1d ago" },
  { id: "f3", student: "Alex Chen", project: "Blockchain Tracker", text: "Needs differentiation from Maria's proposal. See AI suggestions.", time: "2d ago" },
  { id: "f4", student: "Tom Bradley", project: "Drone Swarm", text: "Strong technical foundation. Add cost analysis section.", time: "3d ago" },
  { id: "f5", student: "Priya Sharma", project: "Telemedicine", text: "Historical overlap detected. Please pivot or add unique features.", time: "4d ago" },
];

export const approvalStats = Array.from({ length: 30 }, (_, i) => ({
  day: `D${i + 1}`,
  approvals: Math.floor(Math.random() * 8) + 2,
  rejections: Math.floor(Math.random() * 3),
  avgUniqueness: Math.floor(Math.random() * 20) + 70,
}));

export const topKeywords = [
  { keyword: "blockchain", count: 24 },
  { keyword: "machine learning", count: 31 },
  { keyword: "IoT", count: 18 },
  { keyword: "telemedicine", count: 12 },
  { keyword: "drone", count: 9 },
];

export const departmentProjects = [
  { dept: "CS", count: 48, confidence: 82 },
  { dept: "EE", count: 32, confidence: 76 },
  { dept: "ME", count: 28, confidence: 79 },
  { dept: "IT", count: 38, confidence: 84 },
  { dept: "CE", count: 22, confidence: 88 },
];

export const athenaTips = [
  "Athena suggests reviewing high-collision projects first",
  "3 submissions have uniqueness scores below 50% — prioritize these",
  "Batch scan recommended: 6 pending submissions awaiting comparison",
  "Alex Chen and Maria Garcia have 78% similarity — review together",
];

export const searchData = {
  projects: submissions.map(s => ({ id: s.id, title: s.project_title, student: s.student_name, score: s.athena.uniqueness_score })),
  people: [
    { id: "p1", name: "Emma Watson", role: "Student", dept: "CS" },
    { id: "p2", name: "Alex Chen", role: "Student", dept: "CS" },
    { id: "p3", name: "Dr. Sarah Williams", role: "Teacher", dept: "CS" },
  ],
  aiSuggestions: [
    { id: "ai1", text: "Review Alex Chen ↔ Maria Garcia collision (78%)" },
    { id: "ai2", text: "Priya Sharma has 72% historical match — consider rejection" },
    { id: "ai3", text: "Emma Watson ready for approval (92% unique)" },
  ],
};
