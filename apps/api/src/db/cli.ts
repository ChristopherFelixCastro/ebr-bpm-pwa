import {
  down, migrate, seed, testAssignmentsConstraints, testAuditConstraints,
  testBpmConstraints, testCalculationsConstraints, testCatalogConstraints,
  testConstraints, testIdentityScopeConstraints, testInspectionsConstraints,
  testOrganizationStatusConstraints,
  testUniversalGuard,
  testCompanyRequestGuards,
  testCompanyRequestIntegrity,
  testIntakeCases,
  testIntakeDecisionIntegrity,
  testAssignmentSchedulingApi,
  testAssignmentClosureCompatibility,
  testInspectionExecutionCalculations,
  testReviewsReportsClosureApi,
  testVersionedDefinitionsAdmin,
  testDefaultVersionedDefinitions,
  testOfficialImports,
  testBpmGuidance,
  testInspectionLocation,
  testEvidenceCriterion,
  testRequestsConstraints, testReviewsConstraints, testRiskConstraints, verify,
} from './runner.js';

const command = process.argv[2];
try {
  if (command === 'migrate') await migrate();
  else if (command === 'verify') await verify();
  else if (command === 'down') await down();
  else if (command === 'seed') await seed(process.argv[3] ?? '');
  else if (command === 'test:constraints') await testConstraints();
  else if (command === 'test:audit') await testAuditConstraints();
  else if (command === 'test:catalog') await testCatalogConstraints();
  else if (command === 'test:bpm') await testBpmConstraints();
  else if (command === 'test:risk') await testRiskConstraints();
  else if (command === 'test:requests') await testRequestsConstraints();
  else if (command === 'test:assignments') await testAssignmentsConstraints();
  else if (command === 'test:inspections') await testInspectionsConstraints();
  else if (command === 'test:calculations') await testCalculationsConstraints();
  else if (command === 'test:reviews') await testReviewsConstraints();
  else if (command === 'test:identity-scope') await testIdentityScopeConstraints();
  else if (command === 'test:organization-status') await testOrganizationStatusConstraints();
  else if (command === 'test:universal-guard') await testUniversalGuard();
  else if (command === 'test:company-requests-guards') await testCompanyRequestGuards();
  else if (command === 'test:company-request-integrity') await testCompanyRequestIntegrity();
  else if (command === 'test:intake-cases') await testIntakeCases();
  else if (command === 'test:intake-decision-integrity') await testIntakeDecisionIntegrity();
  else if (command === 'test:assignment-scheduling-api') await testAssignmentSchedulingApi();
  else if (command === 'test:assignment-closure-compatibility') await testAssignmentClosureCompatibility();
  else if (command === 'test:inspection-execution-calculations') await testInspectionExecutionCalculations();
  else if (command === 'test:reviews-reports-closure-api') await testReviewsReportsClosureApi();
  else if (command === 'test:versioned-definitions-admin') await testVersionedDefinitionsAdmin();
  else if (command === 'test:default-versioned-definitions') await testDefaultVersionedDefinitions();
  else if (command === 'test:official-imports') await testOfficialImports();
  else if (command === 'test:bpm-guidance') await testBpmGuidance();
  else if (command === 'test:field-location') await testInspectionLocation();
  else if (command === 'test:evidence-criterion') await testEvidenceCriterion();
  else throw new Error('Comando de base de datos no reconocido.');
  console.log(`db:${command} completado.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
