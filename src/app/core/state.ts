import { Injectable, EventEmitter } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, sendPasswordResetEmail, signOut } from 'firebase/auth'; // Adicionei o signOut
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  // --- ESTADOS GERAIS COMPARTILHADOS ---
  usuarioLogado: any = null;
  isAdmin = false;
  produtos: any[] = [];
  carrinho: any[] = [];
  
  produtoAtual: any = null;
  pedidoRecente: any = null;
  
  produtosAtualizados = new EventEmitter<void>();
  // NOVO: Alarme para avisar que o login foi restaurado
  loginCarregado = new EventEmitter<void>(); 
  
  carrinhoPanelAtivo = false;

  // --- FIREBASE ---
  db: any = null;
  auth: any = null;
  storage: any = null; 
  private fbUserUid: string | null = null;

  private firebaseConfig = {
    apiKey: "AIzaSyDMlwDoXM0hRIix8K4CXmPeJahrAVud7LA",
    authDomain: "loja-charms.firebaseapp.com",
    projectId: "loja-charms",
    storageBucket: "loja-charms.firebasestorage.app",
    messagingSenderId: "76109586584",
    appId: "1:76109586584:web:25403a6853fbe5bc9df0ed"
  };

  constructor() {
    this.iniciarFirebase();
  }

  private iniciarFirebase() {
    try {
      if (this.firebaseConfig.apiKey !== "SUA_API_KEY") {
        const firebaseApp = initializeApp(this.firebaseConfig);
        this.auth = getAuth(firebaseApp);
        this.db = getFirestore(firebaseApp);
        this.storage = getStorage(firebaseApp);

        //Ele roda toda vez que abre o site ou dá F5
        onAuthStateChanged(this.auth, async (user: any) => {
          if (user && user.email) {
            this.fbUserUid = user.uid;
            const docRef = doc(this.db, 'usuarios', user.email);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              this.usuarioLogado = docSnap.data();
              this.isAdmin = this.usuarioLogado.isAdmin === true;

              // Avisa os componentes que o usuário "voltou"
              this.loginCarregado.emit();
            }
          } else {
            // Se não tem ninguém mesmo, entra como anônimo para ver a vitrine
            await signInAnonymously(this.auth);
          }
        });

        this.carregarProdutos();
      }
    } catch (e) {
      console.log('Erro ao iniciar Firebase.');
    }
  }

  // NOVA FUNÇÃO: Para sair da conta de verdade no Firebase
  async deslogar() {
    if (this.auth) {
      await signOut(this.auth); // Encerra a sessão no servidor do Google
      this.usuarioLogado = null;
      this.isAdmin = false;
    }
  }

  async carregarProdutos() {
    if (this.db) {
      try {
        const produtosRef = collection(this.db, 'produtos');
        const querySnapshot = await getDocs(produtosRef);

        const produtosBanco: any[] = [];
        querySnapshot.forEach((doc) => {
          produtosBanco.push(doc.data());
        });

        produtosBanco.sort((a, b) => a.id - b.id);
        this.produtos = produtosBanco;
        this.produtosAtualizados.emit();

      } catch (e) {
        console.error("Erro ao buscar produtos do banco:", e);
      }
    }
  }

  get totalItensCarrinho() {
    return this.carrinho.reduce((acc, item) => acc + item.qtd, 0);
  }

  get valorTotalGeralFormatado() {
    const total = this.carrinho.reduce((acc, item) => acc + (item.precoNum * item.qtd), 0);
    return total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  esvaziarCarrinho() {
    this.carrinho = [];
  }

  async redefinirSenha(email: string) {
    if (!this.auth) return { sucesso: false, erro: 'Erro de conexão.' };
    try {
      this.auth.languageCode = 'pt-BR';
      await sendPasswordResetEmail(this.auth, email);
      return { sucesso: true };
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      if (error.code === 'auth/user-not-found') return { sucesso: false, erro: 'Não encontramos uma conta com este e-mail.' };
      if (error.code === 'auth/invalid-email') return { sucesso: false, erro: 'E-mail inválido.' };
      return { sucesso: false, erro: 'Erro ao enviar o e-mail. Tente novamente mais tarde.' };
    }
  }
}