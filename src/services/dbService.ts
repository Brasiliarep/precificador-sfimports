import { db } from '../firebaseConfig';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  onSnapshot
} from 'firebase/firestore';

export const dbService = {
  // Obter todos os produtos (com tempo real opcional)
  getProducts: (callback: (products: any[]) => void) => {
    const q = query(collection(db, 'produtos-sf'), orderBy('nome'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(docs);
    });
  },

  // Adicionar um novo produto
  addProduct: async (product: any) => {
    try {
      const docRef = await addDoc(collection(db, 'produtos-sf'), {
        ...product,
        updatedAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      throw error;
    }
  },

  // Atualizar um campo específico (ex: preço)
  updateProduct: async (id: string, updates: any) => {
    try {
      const productRef = doc(db, 'produtos-sf', id);
      await updateDoc(productRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }
  }
};
