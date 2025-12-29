/**
 * Custom Claims Migration Script
 *
 * VERWENDUNG:
 * 1. Öffne die Hauptanwendung: https://trialog-8a95b.web.app
 * 2. Melde dich als Admin an
 * 3. Öffne die Browser-Console (F12)
 * 4. Kopiere den gesamten Inhalt dieser Datei
 * 5. Füge ihn in die Console ein und drücke Enter
 *
 * HINWEIS:
 * - Nur Admins können diese Migration ausführen
 * - Nach der Migration: Ausloggen und neu einloggen!
 */

(async function migrateToCustomClaims() {
  console.log('🚀 Starting Custom Claims Migration...');

  try {
    // Import Firebase Functions
    const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js');

    // Get Functions instance (default region: us-central1)
    const app = window.firebaseSDK?.app || window.app?.hierarchyService?.repository?.dataSource?.firestore?.app;

    if (!app) {
      throw new Error('Firebase App not found. Make sure you are logged in to the application.');
    }

    const functions = getFunctions(app);
    const migrateFunction = httpsCallable(functions, 'migrateUsersToCustomClaims');

    console.log('📞 Calling migration function...');
    const result = await migrateFunction();

    console.log('✅ Migration successful!');
    console.log('📊 Results:', result.data);

    // Display summary
    const data = result.data;
    const summary = `
╔════════════════════════════════════════╗
║     MIGRATION COMPLETED                ║
╚════════════════════════════════════════╝

Total Users:          ${data.totalUsers}
Successfully Updated: ${data.updatedCount}
Errors:               ${data.errorCount}

${data.message}

Details:
${JSON.stringify(data.results, null, 2)}
    `;

    console.log(summary);

    // Count admins vs employees
    const admins = data.results.filter(r => r.role === 'admin').length;
    const employees = data.results.filter(r => r.role === 'employee').length;

    // Show alert
    alert(
      '✅ Migration erfolgreich!\n\n' +
      `Benutzer aktualisiert: ${data.updatedCount}\n` +
      `Fehler: ${data.errorCount}\n\n` +
      `👑 Admins: ${admins}\n` +
      `👥 Employees: ${employees}\n\n` +
      '⚠️ WICHTIG: Jetzt ausloggen und neu einloggen!'
    );

    return {
      success: true,
      totalUsers: data.totalUsers,
      updatedCount: data.updatedCount,
      errorCount: data.errorCount,
      admins: admins,
      employees: employees,
      results: data.results
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);

    let errorMessage = error.message;

    // User-friendly error messages
    if (error.code === 'functions/permission-denied') {
      errorMessage = 'Zugriff verweigert!\n\nNur Admins können die Migration durchführen.\nBitte stelle sicher, dass du als Admin angemeldet bist.';
    } else if (error.code === 'functions/unauthenticated') {
      errorMessage = 'Nicht angemeldet!\n\nBitte melde dich zuerst in der Hauptanwendung als Admin an.';
    } else if (error.code === 'functions/not-found') {
      errorMessage = 'Cloud Function nicht gefunden!\n\nBitte stelle sicher, dass die Functions deployed wurden:\nfirebase deploy --only functions';
    } else if (error.message.includes('Firebase App not found')) {
      errorMessage = 'Firebase App nicht gefunden!\n\nBitte öffne die Hauptanwendung und melde dich an:\nhttps://trialog-8a95b.web.app';
    }

    alert('❌ Migration fehlgeschlagen:\n\n' + errorMessage);

    return {
      success: false,
      error: errorMessage,
      originalError: error
    };
  }
})();
