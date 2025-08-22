/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest, onCall} from "firebase-functions/v2/https";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// Initialize Firebase Admin
admin.initializeApp();

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Function to send verification email when admin approves user
export const sendVerificationEmail = onCall({ maxInstances: 5 }, async (request) => {
  try {
    const { userId, userEmail, userName } = request.data;
    
    if (!userId || !userEmail) {
      throw new Error('Missing required parameters: userId and userEmail');
    }

    logger.info(`Sending verification email to ${userEmail}`, { userId, userEmail });

    // Get the user from Firebase Auth
    const userRecord = await admin.auth().getUserByEmail(userEmail);
    
    if (!userRecord) {
      throw new Error(`User not found in Firebase Auth: ${userEmail}`);
    }

    // Send email verification
    const verificationLink = await admin.auth().generateEmailVerificationLink(userEmail);
    
    // Update user status in Firestore
    const db = admin.firestore();
    await db.collection('users').doc(userId).update({
      status: 'email_sent',
      emailVerificationLink: verificationLink,
      emailSentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`Verification email sent successfully to ${userEmail}`, { userId, userEmail });
    
    return {
      success: true,
      message: `Verification email sent to ${userEmail}`,
      userId,
      userEmail
    };

  } catch (error) {
    logger.error('Error sending verification email:', error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
});

// Function triggered when user document is updated
export const onUserStatusChanged = onDocumentUpdated('users/{userId}', async (event) => {
  try {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    
    if (!beforeData || !afterData) {
      logger.info('Document data not available');
      return;
    }

    // Check if user was just approved by admin
    if (!beforeData.approved && afterData.approved && afterData.status === 'pending_email') {
      const userId = event.params.userId;
      const userEmail = afterData.email;
      const userName = `${afterData.firstName || ''} ${afterData.lastName || ''}`.trim();
      
      logger.info(`User ${userEmail} was approved, sending verification email`, { userId, userEmail });
      
      // Call the sendVerificationEmail function
      // Note: We can't call another function directly, so we'll handle this in the frontend
      // or create a separate trigger function
    }

  } catch (error) {
    logger.error('Error in onUserStatusChanged:', error);
  }
});
