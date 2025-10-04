import { app } from './firebaseConfig.js';
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const db = getFirestore(app);

async function generateDemoData() {
  try {
    alert('Generating demo data...');

    const demoTutors = [
      {
        uid: 'demo-tutor-1',
        name: 'Sarah Johnson',
        email: 'sarah.tutor@demo.com',
        role: 'tutor',
        subjects: ['Mathematics', 'Physics'],
        availability: ['Monday Morning', 'Wednesday Afternoon', 'Friday Evening'],
        skillLevel: 'Advanced',
        stage: 'loyal',
        rating: 4.8,
        completedSessions: 25,
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        lastActive: new Date()
      },
      {
        uid: 'demo-tutor-2',
        name: 'Michael Chen',
        email: 'michael.tutor@demo.com',
        role: 'tutor',
        subjects: ['Computer Science', 'Mathematics'],
        availability: ['Tuesday Morning', 'Thursday Afternoon', 'Friday Morning'],
        skillLevel: 'Advanced',
        stage: 'customer',
        rating: 4.5,
        completedSessions: 18,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        uid: 'demo-tutor-3',
        name: 'Emily Rodriguez',
        email: 'emily.tutor@demo.com',
        role: 'tutor',
        subjects: ['Chemistry', 'Biology'],
        availability: ['Monday Afternoon', 'Wednesday Morning', 'Thursday Evening'],
        skillLevel: 'Intermediate',
        stage: 'customer',
        rating: 4.9,
        completedSessions: 32,
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        lastActive: new Date()
      },
      {
        uid: 'demo-tutor-4',
        name: 'David Kim',
        email: 'david.tutor@demo.com',
        role: 'tutor',
        subjects: ['English', 'History'],
        availability: ['Tuesday Evening', 'Wednesday Afternoon', 'Friday Afternoon'],
        skillLevel: 'Advanced',
        stage: 'loyal',
        rating: 4.7,
        completedSessions: 40,
        createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
        lastActive: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        uid: 'demo-tutor-5',
        name: 'Priya Patel',
        email: 'priya.tutor@demo.com',
        role: 'tutor',
        subjects: ['Economics', 'Psychology'],
        availability: ['Monday Evening', 'Thursday Morning', 'Friday Morning'],
        skillLevel: 'Intermediate',
        stage: 'customer',
        rating: 4.6,
        completedSessions: 15,
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        lastActive: new Date()
      }
    ];

    const demoLearners = [
      {
        uid: 'demo-learner-1',
        name: 'Alex Thompson',
        email: 'alex.learner@demo.com',
        role: 'learner',
        subjects: ['Mathematics', 'Physics'],
        availability: ['Monday Morning', 'Tuesday Afternoon', 'Friday Evening'],
        skillLevel: 'Beginner',
        stage: 'customer',
        rating: null,
        completedSessions: 5,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastActive: new Date()
      },
      {
        uid: 'demo-learner-2',
        name: 'Jessica Martinez',
        email: 'jessica.learner@demo.com',
        role: 'learner',
        subjects: ['Computer Science'],
        availability: ['Tuesday Morning', 'Thursday Afternoon'],
        skillLevel: 'Intermediate',
        stage: 'qualified',
        rating: null,
        completedSessions: 2,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        lastActive: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        uid: 'demo-learner-3',
        name: 'Ryan Foster',
        email: 'ryan.learner@demo.com',
        role: 'learner',
        subjects: ['Chemistry', 'Biology'],
        availability: ['Monday Afternoon', 'Wednesday Morning'],
        skillLevel: 'Beginner',
        stage: 'loyal',
        rating: null,
        completedSessions: 10,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        lastActive: new Date()
      },
      {
        uid: 'demo-learner-4',
        name: 'Sophia Williams',
        email: 'sophia.learner@demo.com',
        role: 'learner',
        subjects: ['English', 'History'],
        availability: ['Tuesday Evening', 'Friday Afternoon'],
        skillLevel: 'Intermediate',
        stage: 'customer',
        rating: null,
        completedSessions: 7,
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    ];

    const tutorIds = [];
    for (const tutor of demoTutors) {
      const docRef = await addDoc(collection(db, 'users'), tutor);
      tutorIds.push(docRef.id);
      console.log('Created tutor:', tutor.name);
    }

    const learnerIds = [];
    for (const learner of demoLearners) {
      const docRef = await addDoc(collection(db, 'users'), learner);
      learnerIds.push(docRef.id);
      console.log('Created learner:', learner.name);
    }

    const demoSessions = [
      {
        learnerId: learnerIds[0],
        tutorId: tutorIds[0],
        subject: 'Mathematics',
        timeSlot: 'Monday Morning 10:00 AM',
        status: 'completed',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      },
      {
        learnerId: learnerIds[0],
        tutorId: tutorIds[1],
        subject: 'Computer Science',
        timeSlot: 'Tuesday Morning 11:00 AM',
        status: 'accepted',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        learnerId: learnerIds[1],
        tutorId: tutorIds[1],
        subject: 'Computer Science',
        timeSlot: 'Thursday Afternoon 2:00 PM',
        status: 'pending',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        learnerId: learnerIds[2],
        tutorId: tutorIds[2],
        subject: 'Chemistry',
        timeSlot: 'Wednesday Morning 9:00 AM',
        status: 'completed',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)
      },
      {
        learnerId: learnerIds[3],
        tutorId: tutorIds[3],
        subject: 'English',
        timeSlot: 'Friday Afternoon 3:00 PM',
        status: 'accepted',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const session of demoSessions) {
      await addDoc(collection(db, 'sessions'), session);
      console.log('Created session:', session.subject);
    }

    const demoReferrals = [
      {
        userId: learnerIds[0],
        referredUserId: learnerIds[1],
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      },
      {
        userId: learnerIds[1],
        referredUserId: learnerIds[2],
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        userId: learnerIds[0],
        referredUserId: learnerIds[3],
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const referral of demoReferrals) {
      await addDoc(collection(db, 'referrals'), referral);
      console.log('Created referral');
    }

    const demoBusinessMetrics = {
      rfm: [
        { userId: 'demo-learner-1', recencyDays: 5, frequency: 5, monetary: 500 },
        { userId: 'demo-learner-2', recencyDays: 12, frequency: 2, monetary: 150 },
        { userId: 'demo-learner-3', recencyDays: 3, frequency: 10, monetary: 900 },
        { userId: 'demo-learner-4', recencyDays: 8, frequency: 7, monetary: 400 }
      ],
      clv: [
        { userId: 'demo-learner-1', clv: 200 },
        { userId: 'demo-learner-2', clv: 75 },
        { userId: 'demo-learner-3', clv: 450 },
        { userId: 'demo-learner-4', clv: 210 }
      ],
      nps: [
        { userId: 'demo-learner-1', score: 10 },
        { userId: 'demo-learner-2', score: 8 },
        { userId: 'demo-learner-3', score: 9 },
        { userId: 'demo-learner-4', score: 7 }
      ]
    };

    for (const r of demoBusinessMetrics.rfm) {
      await addDoc(collection(db, 'metrics'), { type: 'rfm', ...r });
      console.log('RFM metric created for', r.userId);
    }
    
    // Add CLV metrics
    for (const c of demoBusinessMetrics.clv) {
      await addDoc(collection(db, 'metrics'), { type: 'clv', ...c });
      console.log('CLV metric created for', c.userId);
    }
    
    // Add NPS metrics
    await addDoc(collection(db, 'metrics'), { type: 'nps', nps: demoBusinessMetrics.nps });
    console.log('NPS metrics created');

    console.log('Demo data generation complete!');
    alert('Demo data created successfully! You now have 5 tutors, 4 learners, 5 sessions, and 3 referrals.');

  } catch (error) {
    console.error('Error generating demo data:', error);
    alert('Error generating demo data: ' + error.message);
  }
}

window.generateDemoData = generateDemoData;

