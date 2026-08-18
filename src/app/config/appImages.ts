/** Hormuud ProjectHub branding — official logo & colors */

import projecthubLogoUrl from '../../assets/projecthub-logo-wide.png';
import huHeroStudents from '../../assets/hu/hero-students.webp';
import huCampus from '../../assets/hu/campus.webp';
import huLibrary from '../../assets/hu/library.webp';
import huLab from '../../assets/hu/lab.webp';
import huTeamWork from '../../assets/hu/team-work.webp';
import huConvocation from '../../assets/hu/convocation.webp';

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
export const HU_BRAND_GRADIENT = `linear-gradient(135deg, ${HU_BRAND_GREEN} 0%, ${HU_BRAND_NAVY} 100%)`;

export interface AppImageItem {
  id: string;
  url: string;
  title: string;
  caption: string;
  tags: string[];
}

/**
 * Official Hormuud University photography, bundled so it always loads
 * (no dependency on the live campus CDN or a public/ folder restart).
 */
export const HU_IMAGES = {
  heroStudents: huHeroStudents,
  campus: huCampus,
  library: huLibrary,
  lab: huLab,
  teamWork: huTeamWork,
  convocation: huConvocation,
  csGrad: huConvocation,
  itGrad: huTeamWork,
  orientation: huLibrary,
} as const;

export const HU_IMAGE_FALLBACKS: Record<keyof typeof HU_IMAGES, string> = {
  heroStudents: huHeroStudents,
  campus: huCampus,
  library: huLibrary,
  lab: huLab,
  teamWork: huTeamWork,
  convocation: huConvocation,
  csGrad: huConvocation,
  itGrad: huTeamWork,
  orientation: huLibrary,
} as const;

/** Official HU campus photos — every URL is a local Vite asset, never a remote CDN. */
export const APP_IMAGE_CATALOG: AppImageItem[] = [
  {
    id: 'hu-students-hero',
    url: HU_IMAGES.heroStudents,
    title: 'Hormuud University students',
    caption: 'Students on campus — the community behind every ProjectHub team.',
    tags: ['welcome', 'gallery', 'hero', 'welcome-bg'],
  },
  {
    id: 'hu-convocation',
    url: HU_IMAGES.convocation,
    title: 'Convocation celebration',
    caption: 'Graduates celebrating achievement — the goal every project works toward.',
    tags: ['gallery', 'teacher-portal', 'hero'],
  },
  {
    id: 'hu-library',
    url: HU_IMAGES.library,
    title: 'University library',
    caption: 'Research and study resources for essays, abstracts, and project submissions.',
    tags: ['gallery', 'dashboard', 'student-portal'],
  },
  {
    id: 'hu-exams',
    url: HU_IMAGES.library,
    title: 'Focused study',
    caption: 'The academic environment where Hormuud students prepare and succeed.',
    tags: ['gallery', 'projects'],
  },
  {
    id: 'hu-practical-lab',
    url: HU_IMAGES.lab,
    title: 'Practical lab session',
    caption: 'Hands-on learning — building real skills for team projects.',
    tags: ['gallery', 'team', 'hero'],
  },
  {
    id: 'hu-practical-team',
    url: HU_IMAGES.teamWork,
    title: 'Team practical work',
    caption: 'Students collaborating — invite teammates and build together.',
    tags: ['gallery', 'team', 'dashboard'],
  },
  {
    id: 'hu-practical-advanced',
    url: HU_IMAGES.lab,
    title: 'Advanced practical training',
    caption: 'University students applying theory to real-world project work.',
    tags: ['gallery', 'collaboration'],
  },
  {
    id: 'hu-engineering-lab',
    url: HU_IMAGES.lab,
    title: 'Engineering laboratory',
    caption: 'Modern facilities for technology and engineering project teams.',
    tags: ['gallery', 'projects'],
  },
  {
    id: 'hu-lab-research',
    url: HU_IMAGES.lab,
    title: 'Research laboratory',
    caption: 'Lab space for research-driven student projects.',
    tags: ['gallery', 'collaboration'],
  },
  {
    id: 'hu-student-event',
    url: HU_IMAGES.heroStudents,
    title: 'Student community',
    caption: 'Campus life and student gatherings at Hormuud University.',
    tags: ['gallery', 'student-portal', 'welcome-bg'],
  },
  {
    id: 'hu-campus-building',
    url: HU_IMAGES.campus,
    title: 'Campus grounds',
    caption: 'The Hormuud University campus — where academic projects begin.',
    tags: ['gallery', 'welcome'],
  },
  {
    id: 'hu-grad-cs',
    url: HU_IMAGES.convocation,
    title: 'Computer Science graduates',
    caption: 'CS graduates proud of their accomplishments at Hormuud University.',
    tags: ['gallery', 'teacher-portal'],
  },
  {
    id: 'hu-grad-it',
    url: HU_IMAGES.teamWork,
    title: 'IT graduates',
    caption: 'Information Technology graduates celebrating convocation day.',
    tags: ['gallery'],
  },
  {
    id: 'hu-orientation',
    url: HU_IMAGES.heroStudents,
    title: 'Student orientation',
    caption: 'New students welcomed to campus — start your project journey here.',
    tags: ['gallery', 'dashboard'],
  },
  {
    id: 'hu-campus-life',
    url: HU_IMAGES.campus,
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

export const HERO_SHOWCASE = {
  src: HU_IMAGES.campus,
  title: 'Main Campus',
  caption: 'Modern facilities at the heart of Mogadishu',
} as const;

export const CAMPUS_SHOWCASE = [
  {
    key: 'campus' as const,
    src: HU_IMAGES.campus,
    title: 'Main Campus',
    caption: 'Modern facilities at the heart of Mogadishu',
  },
  {
    key: 'library' as const,
    src: HU_IMAGES.library,
    title: 'University Library',
    caption: 'Research resources and quiet study spaces',
  },
  {
    key: 'lab' as const,
    src: HU_IMAGES.lab,
    title: 'Practical Labs',
    caption: 'Hands-on learning in state-of-the-art labs',
  },
  {
    key: 'teamWork' as const,
    src: HU_IMAGES.teamWork,
    title: 'Team Projects',
    caption: 'Collaborative work that mirrors real industry',
  },
  {
    key: 'convocation' as const,
    src: HU_IMAGES.convocation,
    title: 'Graduation Day',
    caption: 'Celebrating academic achievement on campus',
  },
  {
    key: 'orientation' as const,
    src: HU_IMAGES.heroStudents,
    title: 'Student Life',
    caption: 'A vibrant community of learners and leaders',
  },
] as const;

export const HERO_SLIDES = [
  { src: HU_IMAGES.campus, label: 'Main campus, Mogadishu' },
  { src: HU_IMAGES.heroStudents, label: 'Students on campus' },
  { src: HU_IMAGES.lab, label: 'Practical laboratories' },
  { src: HU_IMAGES.convocation, label: 'Graduation ceremony' },
] as const;

export const FEATURED_STUDENTS = [
  {
    name: 'DAACAD',
    role: 'Computer Science · Year 3',
    quote: 'I assign my capstone to my teacher and track every milestone in ProjectHub.',
    image: HU_IMAGES.csGrad,
  },
  {
    name: 'naciima',
    role: 'Information Technology · Year 4',
    quote: 'Our team invites classmates by HU ID and submits reports with video and voice.',
    image: HU_IMAGES.itGrad,
  },
] as const;
