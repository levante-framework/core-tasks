import { RoarAppkit } from '@levante-framework/firekit';

const roarFirebaseProjects = [
  'gse-yeatmanlab',
  'gse-roar-assessment',
  'gse-roar-assessment-dev',
  'gse-roar-admin',
  'gse-roar-admin-dev',
];

export function isRoarApp(_firekit: RoarAppkit) {
  const projectId = _firekit?.firebaseProject?.firebaseApp?.options?.projectId ?? '';
  return roarFirebaseProjects.includes(projectId);
}
