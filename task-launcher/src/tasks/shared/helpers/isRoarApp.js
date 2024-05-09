const roarFirebaseProjects = [
    'gse-yeatmanlab',
    'gse-roar-assessment',
    'gse-roar-assessment-dev',
    'gse-roar-admin',
    'gse-roar-admin-dev'
];

export function isRoarApp(_firekit) {
const {projectId} = _firekit.firebaseProject.firebaseApp.options;
return roarFirebaseProjects.includes(projectId);
}
