/**
 * Data Source: UserFirestoreDataSource
 * Handles persistence of user profiles to Firebase Firestore
 */

import { firebaseApp } from '../../../../core/firebase/index.js';
import { FIRESTORE_COLLECTIONS } from '../../../../core/config/firebase.config.js';
import { StorageError } from '../../../../core/errors/index.js';

export class UserFirestoreDataSource {
  #firestore = null;

  #getFirestore() {
    if (!this.#firestore) {
      this.#firestore = firebaseApp.firestore;
    }
    return this.#firestore;
  }

  async #importFirestoreHelpers() {
    return await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  }

  async findById(uid) {
    try {
      const firestore = this.#getFirestore();
      const { doc, getDoc } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.USERS, uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      }

      return null;
    } catch (error) {
      throw new StorageError(`Failed to load user: ${error.message}`);
    }
  }

  async findByEmail(email) {
    try {
      const firestore = this.#getFirestore();
      const { collection, query, where, getDocs } = await this.#importFirestoreHelpers();

      const q = query(
        collection(firestore, FIRESTORE_COLLECTIONS.USERS),
        where('email', '==', email.toLowerCase())
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      return querySnapshot.docs[0].data();
    } catch (error) {
      throw new StorageError(`Failed to find user by email: ${error.message}`);
    }
  }

  async findAll() {
    try {
      const firestore = this.#getFirestore();
      const { collection, getDocs } = await this.#importFirestoreHelpers();

      const querySnapshot = await getDocs(
        collection(firestore, FIRESTORE_COLLECTIONS.USERS)
      );

      const users = querySnapshot.docs.map((doc) => doc.data());
      console.log(`✓ Loaded ${users.length} user profiles`);
      return users;
    } catch (error) {
      throw new StorageError(`Failed to load all users: ${error.message}`);
    }
  }

  async save(userData) {
    try {
      const firestore = this.#getFirestore();
      const { doc, setDoc, serverTimestamp } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.USERS, userData.uid);

      await setDoc(docRef, {
        ...userData,
        updatedAt: serverTimestamp(),
      });

      console.log(`✓ User profile saved: ${userData.email}`);
      return userData;
    } catch (error) {
      throw new StorageError(`Failed to save user profile: ${error.message}`);
    }
  }

  async update(userData) {
    try {
      const firestore = this.#getFirestore();
      const { doc, setDoc, serverTimestamp } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.USERS, userData.uid);

      await setDoc(docRef, {
        ...userData,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      console.log(`✓ User profile updated: ${userData.email}`);
      return userData;
    } catch (error) {
      throw new StorageError(`Failed to update user profile: ${error.message}`);
    }
  }

  async delete(uid) {
    try {
      const firestore = this.#getFirestore();
      const { doc, deleteDoc } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.USERS, uid);
      await deleteDoc(docRef);

      console.log(`✓ User profile deleted: ${uid}`);
    } catch (error) {
      throw new StorageError(`Failed to delete user profile: ${error.message}`);
    }
  }

  async exists(uid) {
    try {
      const firestore = this.#getFirestore();
      const { doc, getDoc } = await this.#importFirestoreHelpers();

      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.USERS, uid);
      const docSnap = await getDoc(docRef);

      return docSnap.exists();
    } catch (error) {
      throw new StorageError(`Failed to check user existence: ${error.message}`);
    }
  }
}
