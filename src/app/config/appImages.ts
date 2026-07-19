/** Hormuud ProjectHub branding — official logo & colors */

import projecthubLogoUrl from '../../assets/projecthub-logo.png';

export const UNIVERSITY_NAME = 'Hormuud University';
export const APP_NAME = 'ProjectHub';
export const APP_BRAND_NAME = 'Hormuud ProjectHub';
export const APP_BRAND_TAGLINE = 'Hormuud University';
export const APP_HERO_HEADLINE = 'ProjectHub';
export const APP_HERO_SUBHEADLINE = 'Hormuud University';
export const APP_TAGLINE =
  'Hormuud University students and teachers — Connect, Collaborate, Create';

/** Official Hormuud ProjectHub logo (bundled + public) */
export const HU_LOGO_URL = projecthubLogoUrl;
export const HU_LOGO_PUBLIC_URL = '/projecthub-logo.png';
export const HU_FAVICON_URL = '/projecthub-favicon.png';
export const HU_WEBSITE = 'https://hu.edu.so';

/** Brand palette from official ProjectHub logo */
export const HU_BRAND_GREEN = '#16A34A';
export const HU_BRAND_NAVY = '#0F2D5C';
export const HU_BRAND_GREEN_LIGHT = '#22c55e';
export const HU_BRAND_GREEN_BRIGHT = '#4ade80';

export interface AppImageItem {
  id: string;
  url: string;
  title: string;
  caption: string;
  tags: string[];
}

/** Official HU campus & student photos */
export const APP_IMAGE_CATALOG: AppImageItem[] = [
  {
    id: 'hu-students-hero',
    url: 'https://hu.edu.so/static/img/public/heros/students.jpg',
    title: 'Hormuud University students',
    caption: 'Students on campus — the community behind every ProjectHub team.',
    tags: ['welcome', 'gallery', 'hero', 'welcome-bg'],
  },
  {
    id: 'hu-convocation',
    url: 'https://hu.edu.so/static/img/public/Convocational/7.jpg',
    title: 'Convocation celebration',
    caption: 'Graduates celebrating achievement — the goal every project works toward.',
    tags: ['gallery', 'teacher-portal', 'hero'],
  },
  {
    id: 'hu-library',
    url: 'https://hu.edu.so/static/img/public/library.jpg',
    title: 'University library',
    caption: 'Research and study resources for essays, abstracts, and project submissions.',
    tags: ['gallery', 'dashboard', 'student-portal'],
  },
  {
    id: 'hu-exams',
    url: 'https://hu.edu.so/static/img/public/Exam/exam4.jpg',
    title: 'Exam hall',
    caption: 'Focused academic environment where Hormuud students prepare and succeed.',
    tags: ['gallery', 'projects'],
  },
  {
    id: 'hu-practical-lab',
    url: 'https://hu.edu.so/static/img/public/practical/practical3.jpg',
    title: 'Practical lab session',
    caption: 'Hands-on learning — building real skills for team projects.',
    tags: ['gallery', 'team', 'hero'],
  },
  {
    id: 'hu-practical-team',
    url: 'https://hu.edu.so/static/img/public/practical/practical4.jpg',
    title: 'Team practical work',
    caption: 'Students collaborating in the lab — invite teammates and build together.',
    tags: ['gallery', 'team', 'dashboard'],
  },
  {
    id: 'hu-practical-advanced',
    url: 'https://hu.edu.so/static/img/public/practical/practical7.jpg',
    title: 'Advanced practical training',
    caption: 'University students applying theory to real-world project work.',
    tags: ['gallery', 'collaboration'],
  },
  {
    id: 'hu-engineering-lab',
    url: 'https://hu.edu.so/static/img/public/eng-lap.jpg',
    title: 'Engineering laboratory',
    caption: 'Modern facilities for technology and engineering project teams.',
    tags: ['gallery', 'projects'],
  },
  {
    id: 'hu-lab-research',
    url: 'https://hu.edu.so/static/img/public/LAB/LAB1.jpg',
    title: 'Research laboratory',
    caption: 'State-of-the-art lab space for research-driven student projects.',
    tags: ['gallery', 'collaboration'],
  },
  {
    id: 'hu-student-event',
    url: 'https://hu.edu.so/static/img/public/events/doon_arday.webp',
    title: 'Student community event',
    caption: 'Campus life and student gatherings at Hormuud University.',
    tags: ['gallery', 'student-portal', 'welcome-bg'],
  },
  {
    id: 'hu-campus-building',
    url: 'https://hu.edu.so/static/img/public/heros/biulding1.jpg',
    title: 'Campus grounds',
    caption: 'The Hormuud University campus — where academic projects begin.',
    tags: ['gallery', 'welcome'],
  },
  {
    id: 'hu-grad-cs',
    url: 'https://hu.edu.so/static/img/public/graduates/cs/1.jpg',
    title: 'Computer Science graduates',
    caption: 'CS graduates proud of their accomplishments at Hormuud University.',
    tags: ['gallery', 'teacher-portal'],
  },
  {
    id: 'hu-grad-it',
    url: 'https://hu.edu.so/static/img/public/graduates/it/1.jpg',
    title: 'IT graduates',
    caption: 'Information Technology graduates celebrating convocation day.',
    tags: ['gallery'],
  },
  {
    id: 'hu-orientation',
    url: 'https://hu.edu.so/article_imgs/645988458_1317497220409563_8152559070049323029_n.webp',
    title: 'Student orientation',
    caption: 'New students welcomed to campus — start your project journey here.',
    tags: ['gallery', 'dashboard'],
  },
  {
    id: 'hu-campus-life',
    url: 'https://hu.edu.so/article_imgs/643876326_1316225367203415_5794250081975534899_n.webp',
    title: 'Campus life',
    caption: 'Students engaging in university activities and academic community.',
    tags: ['gallery', 'welcome'],
  },
];

function byId(id: string): AppImageItem {
  const item = APP_IMAGE_CATALOG.find(i => i.id === id);
  if (!item) throw new Error(`Missing image: ${id}`);
  return item;
}

function byTag(tag: string): AppImageItem[] {
  return APP_IMAGE_CATALOG.filter(i => i.tags.includes(tag));
}

export const APP_IMAGES = {
  teamWork: byId('hu-practical-team').url,
  studentsStudy: byId('hu-library').url,
  projectPlanning: byId('hu-practical-lab').url,
  laptopTeam: byId('hu-engineering-lab').url,
  campusFriends: byId('hu-student-event').url,
  campusGroup: byId('hu-students-hero').url,
  collaboration: byId('hu-practical-advanced').url,
  studentLaptop: byId('hu-orientation').url,
  graduation: byId('hu-convocation').url,
  welcomeBg: byId('hu-students-hero').url,
  studentPortal: byId('hu-library').url,
  teacherPortal: byId('hu-convocation').url,
  studentReading: byId('hu-exams').url,
} as const;

export const APP_GALLERY_ITEMS = byTag('gallery');
export const APP_GALLERY = APP_GALLERY_ITEMS.map(i => i.url);

export function getImageByUrl(url: string): AppImageItem | undefined {
  return APP_IMAGE_CATALOG.find(i => i.url === url);
}
