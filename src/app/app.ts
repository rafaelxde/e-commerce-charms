import { Component, AfterViewChecked, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser'; // <--- ADICIONADO PARA SEO
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';

declare var lucide: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './app.html',
  styleUrls: ['../styles.css']
})
export class AppComponent implements OnInit, AfterViewChecked {
  private cdr = inject(ChangeDetectorRef);
  private titleService = inject(Title); 
  private metaService = inject(Meta);   

  // NAVEGAÇÃO
  telaAtual: 'loja' | 'login' | 'comprovante' | 'historico' = 'loja';

  // ESTADOS DE AUTENTICAÇÃO E PERFIL
  modoAuth: 'login' | 'cadastro' = 'login';
  authEmail = '';
  authSenha = '';
  authBairro = '';
  authNumero = '';
  authComp = '';
  erroEmail = false;
  
  // VARIÁVEIS DE EDIÇÃO DE ENDEREÇO
  editandoEndereco = false;
  editBairro = '';
  editNumero = '';
  editComp = '';
  
  // ESTADOS DE DADOS
  usuarioLogado: any = null;
  pedidoRecente: any = null;
  historicoPedidos: any[] = [];
  carregandoHistorico = false;

  // --- FILTROS DE CATEGORIA ---
  categorias = ['Todos', 'Blusa', 'Cropped', 'Calça', 'Shorts', 'Body', 'Vestido', 'Saia', 'Macacão'];
  categoriaSelecionada = 'Todos';

  // IMAGENS E COLEÇÕES
  produtos: any[] = [
    // --- CONJUNTO 1 ---
    { 
      nome: "Conjunto Tropical Completo (Camisa + Cropped + Calça)", 
      categoria: "Conjunto", precoAntigo: "R$ 449,90", preco: "R$ 399,90", precoNum: 399.90, 
      img: "/produtos/conjunto1.png", esconderNoTodos: false
    },
    { 
      nome: "Camisa Botões Estampa Coqueiros", 
      categoria: "Blusa", precoAntigo: "R$ 159,90", preco: "R$ 139,90", precoNum: 139.90, 
      img: "/produtos/conjunto1.png", esconderNoTodos: true 
    },
    { 
      nome: "Cropped Básico Off-White", 
      categoria: "Cropped", precoAntigo: "R$ 89,90", preco: "R$ 79,90", precoNum: 79.90, 
      img: "/produtos/conjunto9.png", esconderNoTodos: true 
    },
    { 
      nome: "Calça Envelope Off-White", 
      categoria: "Calça", precoAntigo: "R$ 199,90", preco: "R$ 179,90", precoNum: 179.90, 
      img: "/produtos/conjunto9.png", esconderNoTodos: true 
    },

    // --- CONJUNTO 2 ---
    { 
      nome: "Conjunto Coqueiros (Colete Longo + Calça)", 
      categoria: "Conjunto", precoAntigo: "R$ 359,90", preco: "R$ 319,90", precoNum: 319.90, 
      img: "/produtos/conjunto2.png", esconderNoTodos: false
    },
    { 
      nome: "Colete Longo Estampa Coqueiros", 
      categoria: "Blusa", precoAntigo: "R$ 179,90", preco: "R$ 159,90", precoNum: 159.90, 
      img: "/produtos/conjunto2.png", esconderNoTodos: true 
    },
    { 
      nome: "Calça Reta Estampa Coqueiros", 
      categoria: "Calça", precoAntigo: "R$ 179,90", preco: "R$ 159,90", precoNum: 159.90, 
      img: "/produtos/conjunto2.png", esconderNoTodos: true 
    },

    // --- CONJUNTO 3 ---
    { 
      nome: "Vestido Midi Estampa Coqueiros", 
      categoria: "Vestido", precoAntigo: "R$ 259,90", preco: "R$ 229,90", precoNum: 229.90, 
      img: "/produtos/conjunto3.png", esconderNoTodos: false
    },

    // --- CONJUNTOS 4, 5 E 6 ---
    { 
      nome: "Camisa de Botões Azul Escura Clássica", 
      categoria: "Blusa", precoAntigo: "R$ 169,90", preco: "R$ 149,90", precoNum: 149.90, 
      img: "/produtos/conjunto4.png", esconderNoTodos: true 
    },
    { 
      nome: "Saia Palmeiras Transpassada", 
      categoria: "Saia", precoAntigo: "R$ 199,90", preco: "R$ 179,90", precoNum: 179.90, 
      img: "/produtos/conjunto4.png", esconderNoTodos: true 
    },
    { 
      nome: "Saia Curta Branca com Botões de Pérola", 
      categoria: "Saia", precoAntigo: "R$ 189,90", preco: "R$ 169,90", precoNum: 169.90, 
      img: "/produtos/conjunto6.png", esconderNoTodos: true 
    },
    { 
      nome: "Shorts de Alfaiataria Azul Escuro Clássico", 
      categoria: "Shorts", precoAntigo: "R$ 159,90", preco: "R$ 139,90", precoNum: 139.90, 
      img: "/produtos/conjunto5.png", esconderNoTodos: true 
    },

    { 
      nome: "Conjunto Azure Palms com Saia Transpassada (Camisa + Saia)", 
      categoria: "Conjunto", precoAntigo: "R$ 369,90", preco: "R$ 329,90", precoNum: 329.90, 
      img: "/produtos/conjunto4.png", esconderNoTodos: false 
    },
    { 
      nome: "Conjunto Azure Palms com Shorts (Camisa + Shorts)", 
      categoria: "Conjunto", precoAntigo: "R$ 329,90", preco: "R$ 289,90", precoNum: 289.90, 
      img: "/produtos/conjunto5.png", esconderNoTodos: false 
    },
    { 
      nome: "Conjunto Azure Palms com Saia de Botões (Camisa + Saia)", 
      categoria: "Conjunto", precoAntigo: "R$ 359,90", preco: "R$ 319,90", precoNum: 319.90, 
      img: "/produtos/conjunto6.png", esconderNoTodos: false 
    },

    // --- CONJUNTOS 7, 8 E 9 ---
    { 
      nome: "Vestido Riviera Estampa Costeira (Midi)", 
      categoria: "Vestido", precoAntigo: "R$ 279,90", preco: "R$ 249,90", precoNum: 249.90, 
      img: "/produtos/conjunto7.png", esconderNoTodos: false
    },
    { 
      nome: "Macacão Riviera Linho Coastal", 
      categoria: "Macacão", precoAntigo: "R$ 359,90", preco: "R$ 329,90", precoNum: 329.90, 
      img: "/produtos/conjunto8.png", esconderNoTodos: false
    },
    { 
      nome: "Conjunto Azure Riviera Off-White (Cropped + Calça)", 
      categoria: "Conjunto", precoAntigo: "R$ 399,90", preco: "R$ 379,90", precoNum: 379.90, 
      img: "/produtos/conjunto9.png", esconderNoTodos: false 
    },

    // --- CONJUNTOS 10, 11, 12 ---
    { 
      nome: "Vestido Off-White Mangas Laise Ombro a Ombro", 
      categoria: "Vestido", precoAntigo: "R$ 289,90", preco: "R$ 259,90", precoNum: 259.90, 
      img: "/produtos/conjunto10.png", esconderNoTodos: false 
    },
    { 
      nome: "Blusa Peplum Laise Off-White", 
      categoria: "Blusa", precoAntigo: "R$ 159,90", preco: "R$ 139,90", precoNum: 139.90, 
      img: "/produtos/conjunto11.png", esconderNoTodos: true 
    },
    { 
      nome: "Saia Midi Básica Off-White", 
      categoria: "Saia", precoAntigo: "R$ 189,90", preco: "R$ 169,90", precoNum: 169.90, 
      img: "/produtos/conjunto11.png", esconderNoTodos: true 
    },
    { 
      nome: "Bermuda de Alfaiataria Off-White", 
      categoria: "Shorts", precoAntigo: "R$ 169,90", preco: "R$ 149,90", precoNum: 149.90, 
      img: "/produtos/conjunto12.png", esconderNoTodos: true 
    },
    { 
      nome: "Conjunto Laise com Saia Midi (Blusa + Saia)", 
      categoria: "Conjunto", precoAntigo: "R$ 349,80", preco: "R$ 309,80", precoNum: 309.80, 
      img: "/produtos/conjunto11.png", esconderNoTodos: false 
    },
    { 
      nome: "Conjunto Laise com Bermuda (Blusa + Bermuda)", 
      categoria: "Conjunto", precoAntigo: "R$ 329,80", preco: "R$ 289,80", precoNum: 289.80, 
      img: "/produtos/conjunto12.png", esconderNoTodos: false 
    },

    // --- CONJUNTOS 13, 14, 15 ---
    { 
      nome: "Camisa de Botões Laranja Manga 3/4", 
      categoria: "Blusa", precoAntigo: "R$ 169,90", preco: "R$ 149,90", precoNum: 149.90, 
      img: "/produtos/conjunto13.png", esconderNoTodos: true 
    },
    { 
      nome: "Bermuda de Alfaiataria Off-White", 
      categoria: "Shorts", precoAntigo: "R$ 169,90", preco: "R$ 149,90", precoNum: 149.90, 
      img: "/produtos/conjunto13.png", esconderNoTodos: true 
    },
    { 
      nome: "Cropped Nó Frontal Estampa Floral Laranja", 
      categoria: "Cropped", precoAntigo: "R$ 119,90", preco: "R$ 99,90", precoNum: 99.90, 
      img: "/produtos/conjunto14.png", esconderNoTodos: true 
    },
    { 
      nome: "Saia Longa Fluida Estampa Floral Laranja", 
      categoria: "Saia", precoAntigo: "R$ 219,90", preco: "R$ 199,90", precoNum: 199.90, 
      img: "/produtos/conjunto14.png", esconderNoTodos: true 
    },
    { 
      nome: "Conjunto Alfaiataria Sunset (Camisa + Bermuda)", 
      categoria: "Conjunto", precoAntigo: "R$ 339,80", preco: "R$ 299,80", precoNum: 299.80, 
      img: "/produtos/conjunto13.png", esconderNoTodos: false 
    },
    { 
      nome: "Conjunto Floral Sunset Longo (Cropped + Saia)", 
      categoria: "Conjunto", precoAntigo: "R$ 339,80", preco: "R$ 299,80", precoNum: 299.80, 
      img: "/produtos/conjunto14.png", esconderNoTodos: false 
    },
    { 
      nome: "Vestido Midi Estampa Floral Sunset", 
      categoria: "Vestido", precoAntigo: "R$ 269,90", preco: "R$ 249,90", precoNum: 249.90, 
      img: "/produtos/conjunto15.png", esconderNoTodos: false 
    },

    // --- CONJUNTOS 16, 17, 18 ---
    { 
      nome: "Saia Midi Mostarda Evasê", 
      categoria: "Saia", precoAntigo: "R$ 199,90", preco: "R$ 179,90", precoNum: 179.90, 
      img: "/produtos/conjunto16.png", esconderNoTodos: true 
    },
    { 
      nome: "Cropped Mostarda com Botões Frontais", 
      categoria: "Cropped", precoAntigo: "R$ 149,90", preco: "R$ 129,90", precoNum: 129.90, 
      img: "/produtos/conjunto17.png", esconderNoTodos: true 
    },
    { 
      nome: "Camisa Cropped Mostarda Manga Curta", 
      categoria: "Blusa", precoAntigo: "R$ 169,90", preco: "R$ 149,90", precoNum: 149.90, 
      img: "/produtos/conjunto18.png", esconderNoTodos: true 
    },
    { 
      nome: "Bermuda Shorts Mostarda de Alfaiataria", 
      categoria: "Shorts", precoAntigo: "R$ 179,90", preco: "R$ 159,90", precoNum: 159.90, 
      img: "/produtos/conjunto18.png", esconderNoTodos: true 
    },
    { 
      nome: "Conjunto Mostarda Floral (Cropped + Saia)", 
      categoria: "Conjunto", precoAntigo: "R$ 319,80", preco: "R$ 279,80", precoNum: 279.80, 
      img: "/produtos/conjunto16.png", esconderNoTodos: false 
    },
    { 
      nome: "Conjunto Mostarda Elegance (Cropped + Saia)", 
      categoria: "Conjunto", precoAntigo: "R$ 349,80", preco: "R$ 309,80", precoNum: 309.80, 
      img: "/produtos/conjunto17.png", esconderNoTodos: false 
    },
    { 
      nome: "Conjunto Mostarda Safári (Camisa + Bermuda)", 
      categoria: "Conjunto", precoAntigo: "R$ 349,80", preco: "R$ 309,80", precoNum: 309.80, 
      img: "/produtos/conjunto18.png", esconderNoTodos: false 
    },

    // --- CONJUNTOS 19, 20, 21 ---
    { 
      nome: "Regata Branca com Detalhes", 
      categoria: "Blusa", precoAntigo: "R$ 139,90", preco: "R$ 119,90", precoNum: 119.90, 
      img: "/produtos/conjunto19.png", esconderNoTodos: true 
    },
    { 
      nome: "Calça Pantalona Branca Fluida", 
      categoria: "Calça", precoAntigo: "R$ 219,90", preco: "R$ 199,90", precoNum: 199.90, 
      img: "/produtos/conjunto19.png", esconderNoTodos: true 
    },
    { 
      nome: "Body Branco Um Ombro Só", 
      categoria: "Body", precoAntigo: "R$ 119,90", preco: "R$ 99,90", precoNum: 99.90, 
      img: "/produtos/conjunto20.png", esconderNoTodos: true 
    },
    { 
      nome: "Saia Midi Verde Sálvia Lastex", 
      categoria: "Saia", precoAntigo: "R$ 199,90", preco: "R$ 179,90", precoNum: 179.90, 
      img: "/produtos/conjunto20.png", esconderNoTodos: true 
    },
    { 
      nome: "Conjunto Pantalona Branco (Blusa + Calça)", 
      categoria: "Conjunto", precoAntigo: "R$ 359,80", preco: "R$ 319,80", precoNum: 319.80, 
      img: "/produtos/conjunto19.png", esconderNoTodos: false 
    },
    { 
      nome: "Conjunto Sálvia Elegance (Body + Saia)", 
      categoria: "Conjunto", precoAntigo: "R$ 279,80", preco: "R$ 279,80", precoNum: 279.80, 
      img: "/produtos/conjunto20.png", esconderNoTodos: false 
    },
    { 
      nome: "Vestido Midi Verde Sálvia Corset", 
      categoria: "Vestido", precoAntigo: "R$ 289,90", preco: "R$ 259,90", precoNum: 259.90, 
      img: "/produtos/conjunto21.png", esconderNoTodos: false 
    },

    // --- CONJUNTOS 22, 23, 24 ---
    { 
      nome: "Vestido Midi Terracota Puff Sleeve", 
      categoria: "Vestido", precoAntigo: "R$ 299,90", preco: "R$ 269,90", precoNum: 269.90, 
      img: "/produtos/conjunto22.png", esconderNoTodos: false 
    },
    { 
      nome: "Macacão Pantalona Preto Tie Waist", 
      categoria: "Macacão", precoAntigo: "R$ 369,90", preco: "R$ 339,90", precoNum: 339.90, 
      img: "/produtos/conjunto23.png", esconderNoTodos: false 
    },
    { 
      nome: "Vestido Midi Verde Vibrante Botões", 
      categoria: "Vestido", precoAntigo: "R$ 319,90", preco: "R$ 289,90", precoNum: 289.90, 
      img: "/produtos/conjunto24.png", esconderNoTodos: false 
    },

    // --- CONJUNTOS 25, 26, 27 ---
    { 
      nome: "Regata Um Ombro Floral Verde", 
      categoria: "Blusa", precoAntigo: "R$ 149,90", preco: "R$ 129,90", precoNum: 129.90, 
      img: "/produtos/conjunto25.png", esconderNoTodos: true 
    },
    { 
      nome: "Calça Pantalona Floral Verde Fenda", 
      categoria: "Calça", precoAntigo: "R$ 219,90", preco: "R$ 199,90", precoNum: 199.90, 
      img: "/produtos/conjunto25.png", esconderNoTodos: true 
    },
    { 
      nome: "Cropped Manga 3/4 Verde Escuro", 
      categoria: "Cropped", precoAntigo: "R$ 139,90", preco: "R$ 119,90", precoNum: 119.90, 
      img: "/produtos/conjunto26.png", esconderNoTodos: true 
    },
    { 
      nome: "Saia Midi Verde Escuro Três Marias", 
      categoria: "Saia", precoAntigo: "R$ 199,90", preco: "R$ 179,90", precoNum: 179.90, 
      img: "/produtos/conjunto26.png", esconderNoTodos: true 
    },
    { 
      nome: "Colete Bege com Bordados", 
      categoria: "Blusa", precoAntigo: "R$ 169,90", preco: "R$ 149,90", precoNum: 149.90, 
      img: "/produtos/conjunto27.png", esconderNoTodos: true 
    },
    { 
      nome: "Conjunto Floral Resort (Regata + Calça)", 
      categoria: "Conjunto", precoAntigo: "R$ 369,80", preco: "R$ 329,80", precoNum: 329.80, 
      img: "/produtos/conjunto25.png", esconderNoTodos: false 
    },
    { 
      nome: "Conjunto Verde Elegance (Cropped + Saia)", 
      categoria: "Conjunto", precoAntigo: "R$ 339,80", preco: "R$ 299,80", precoNum: 299.80, 
      img: "/produtos/conjunto26.png", esconderNoTodos: false 
    },
    { 
      nome: "Conjunto Bordado Tropical (Colete + Saia)", 
      categoria: "Conjunto", precoAntigo: "R$ 369,80", preco: "R$ 329,80", precoNum: 329.80, 
      img: "/produtos/conjunto27.png", esconderNoTodos: false 
    },

    // --- CONJUNTOS 28, 29, 30 (Vestidos e Folhagem Outono) ---
    { 
      nome: "Vestido Curto Bege Bordado", 
      categoria: "Vestido", precoAntigo: "R$ 229,90", preco: "R$ 199,90", precoNum: 199.90, 
      img: "/produtos/conjunto28.png", esconderNoTodos: false 
    },
    { 
      nome: "Vestido Midi Estampa Folhagem Outono", 
      categoria: "Vestido", precoAntigo: "R$ 279,90", preco: "R$ 249,90", precoNum: 249.90, 
      img: "/produtos/conjunto29.png", esconderNoTodos: false 
    },
    { 
      nome: "Blusa Estampa Folhagem Amarração Frontal", 
      categoria: "Blusa", precoAntigo: "R$ 149,90", preco: "R$ 129,90", precoNum: 129.90, 
      img: "/produtos/conjunto30.png", esconderNoTodos: true 
    },
    { 
      nome: "Calça Pantalona Estampa Folhagem", 
      categoria: "Calça", precoAntigo: "R$ 219,90", preco: "R$ 199,90", precoNum: 199.90, 
      img: "/produtos/conjunto30.png", esconderNoTodos: true 
    },
    { 
      nome: "Conjunto Folhagem Outono (Blusa + Calça)", 
      categoria: "Conjunto", precoAntigo: "R$ 369,80", preco: "R$ 329,80", precoNum: 329.80, 
      img: "/produtos/conjunto30.png", esconderNoTodos: false 
    }
  ];
  
  tamanhos = ['PP', 'P', 'M', 'G', 'GG'];

  modalAtivo = false;
  produtoAtual: any = null;
  tamanhoSelecionado: string | null = null;
  quantidade = 1;

  carrinhoPanelAtivo = false;
  carrinho: any[] = [];

  popupAtivo = false;
  popupMensagem = '';
  popupInputVisible = false;
  popupCancelVisible = false;
  popupInputValue: number = 1;
  acaoConfirmar: () => void = () => {};

  // REFERÊNCIAS DO FIREBASE
  private db: any = null;
  private auth: any = null;
  private fbUserUid: string | null = null;

  private firebaseConfig = {
    apiKey: "AIzaSyDMlwDoXM0hRIix8K4CXmPeJahrAVud7LA",
    authDomain: "loja-charms.firebaseapp.com",
    projectId: "loja-charms",
    storageBucket: "loja-charms.firebasestorage.app",
    messagingSenderId: "76109586584",
    appId: "1:76109586584:web:25403a6853fbe5bc9df0ed"
  };

  async ngOnInit() {
    this.titleService.setTitle("Charm's MV Confecções | Moda Feminina");
    this.metaService.addTags([
      { name: 'description', content: 'Fábrica Charm\'s em Mombaça. Peças femininas que unem elegância, conforto e durabilidade real. Conheça nossa coleção.' },
      { name: 'keywords', content: 'moda feminina, roupas femininas, mombaça, vestido, confecção, fábrica de roupas' },
      { name: 'robots', content: 'index, follow' }
    ]);

    try {
      if (this.firebaseConfig.apiKey !== "SUA_API_KEY") {
        const firebaseApp = initializeApp(this.firebaseConfig);
        this.auth = getAuth(firebaseApp);
        this.db = getFirestore(firebaseApp);

        await signInAnonymously(this.auth);

        onAuthStateChanged(this.auth, async (user: any) => {
          if (user) {
            this.fbUserUid = user.uid;
          }
        });
      } else {
        console.warn('⚠️ As chaves do Firebase não foram preenchidas no código!');
      }
    } catch (e) {
      console.log('Erro ao iniciar Firebase. Rodando localmente.');
    }
  }

  ngAfterViewChecked() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // --- LÓGICA DE FILTRAGEM ---
  filtrarPor(categoria: string) {
    this.categoriaSelecionada = categoria;
  }

  get produtosFiltrados() {
    if (this.categoriaSelecionada === 'Todos') {
      return this.produtos.filter(p => !p.esconderNoTodos);
    }
    return this.produtos.filter(p => p.categoria === this.categoriaSelecionada);
  }

  irPara(tela: 'loja' | 'login' | 'comprovante' | 'historico') {
    this.telaAtual = tela;
    window.scrollTo(0,0);
    this.cdr.detectChanges();
  }

  alternarModoAuth() {
    this.modoAuth = this.modoAuth === 'login' ? 'cadastro' : 'login';
    this.authEmail = ''; this.authSenha = ''; this.erroEmail = false;
  }

  validarEmail() {
    if (!this.authEmail) {
      this.erroEmail = false;
      return;
    }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.erroEmail = !regex.test(this.authEmail);
  }

  async executarAuth() {
    this.validarEmail();
    
    if (this.erroEmail || !this.authEmail || !this.authSenha) {
      this.mostrarPopup("Preencha o e-mail e a senha corretamente.", false, false, () => this.fecharPopup());
      return;
    }

    if (this.modoAuth === 'cadastro') {
      if (!this.authBairro || !this.authNumero) {
        this.mostrarPopup("Bairro e Número são obrigatórios para entrega.", false, false, () => this.fecharPopup());
        return;
      }

      const novoUsuario = {
        email: this.authEmail,
        senha: this.authSenha, 
        bairro: this.authBairro,
        numero: this.authNumero,
        comp: this.authComp
      };
      
      if (this.db) {
        const docRef = doc(this.db, 'usuarios', this.authEmail);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
           this.mostrarPopup("Este e-mail já está cadastrado. Vá em 'Fazer login'.", false, false, () => this.fecharPopup());
           return;
        }
        
        await setDoc(docRef, novoUsuario);
      }
      
      this.usuarioLogado = novoUsuario;
      this.mostrarPopup("Conta criada com sucesso! Bem-vinda à Charm's.", false, false, () => {
        this.fecharPopup();
        this.irPara('loja');
      });

    } else { // LOGIN
       if (this.db) {
         const docRef = doc(this.db, 'usuarios', this.authEmail);
         const docSnap = await getDoc(docRef);
         
         if (docSnap.exists() && docSnap.data()['senha'] === this.authSenha) {
            this.usuarioLogado = docSnap.data();
            this.mostrarPopup("Login efetuado com sucesso!", false, false, () => {
             this.fecharPopup();
             this.irPara('loja');
           });
         } else {
            this.mostrarPopup("E-mail ou senha incorretos.", false, false, () => this.fecharPopup());
         }
       } else {
         if (this.usuarioLogado && this.usuarioLogado.email === this.authEmail && this.usuarioLogado.senha === this.authSenha) {
           this.mostrarPopup("Login efetuado com sucesso!", false, false, () => {
            this.fecharPopup();
            this.irPara('loja');
          });
         } else {
           this.mostrarPopup("Erro ao conectar com o banco de dados.", false, false, () => this.fecharPopup());
         }
       }
    }
  }

  fazerLogout() {
    this.usuarioLogado = null;
    this.authEmail = '';
    this.authSenha = '';
    this.modoAuth = 'login';
    this.mostrarPopup("Você saiu da sua conta.", false, false, () => {
       this.fecharPopup();
       this.irPara('loja');
    });
  }

  iniciarEdicaoEndereco() {
    this.editBairro = this.usuarioLogado.bairro;
    this.editNumero = this.usuarioLogado.numero;
    this.editComp = this.usuarioLogado.comp || '';
    this.editandoEndereco = true;
  }

  async salvarEndereco() {
    if (!this.editBairro || !this.editNumero) {
      this.mostrarPopup("Bairro e Número são obrigatórios.", false, false, () => this.fecharPopup());
      return;
    }

    this.usuarioLogado.bairro = this.editBairro;
    this.usuarioLogado.numero = this.editNumero;
    this.usuarioLogado.comp = this.editComp;
    this.editandoEndereco = false;

    if (this.db) {
      try {
        const docRef = doc(this.db, 'usuarios', this.usuarioLogado.email);
        await updateDoc(docRef, {
          bairro: this.editBairro,
          numero: this.editNumero,
          comp: this.editComp
        });
        this.mostrarPopup("Endereço atualizado com sucesso!", false, false, () => this.fecharPopup());
      } catch (e) {
        console.error("Erro ao atualizar o endereço no banco:", e);
      }
    }
  }

  async abrirHistorico() {
    if (!this.usuarioLogado) return;
    this.irPara('historico');
    this.carregandoHistorico = true;
    this.historicoPedidos = [];

    if (this.db) {
      try {
        const pedidosRef = collection(this.db, 'pedidos');
        const q = query(pedidosRef, where("clienteEmail", "==", this.usuarioLogado.email));
        const querySnapshot = await getDocs(q);
        
        const pedidosEncontrados: any[] = [];
        querySnapshot.forEach((doc) => {
          pedidosEncontrados.push({ id: doc.id, ...doc.data() });
        });

        pedidosEncontrados.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        this.historicoPedidos = pedidosEncontrados;
      } catch (e) {
        console.error("Erro ao buscar histórico:", e);
      }
    }
    this.carregandoHistorico = false;
    this.cdr.detectChanges();
  }

  abrirModalProduto(produto: any) {
    this.produtoAtual = produto;
    this.quantidade = 1;
    this.tamanhoSelecionado = null;
    this.modalAtivo = true;
  }
  fecharModalProduto() { this.modalAtivo = false; }
  selecionarTamanho(tamanho: string) { this.tamanhoSelecionado = tamanho; }
  alterarQuantidade(valor: number) { if (this.quantidade + valor > 0) this.quantidade += valor; }

  adicionarAoCarrinho() {
    if (!this.tamanhoSelecionado) {
      this.mostrarPopup("Por favor, selecione um tamanho.", false, false, () => this.fecharPopup());
      return;
    }
    const itemExistente = this.carrinho.find(item => item.nome === this.produtoAtual.nome && item.tamanho === this.tamanhoSelecionado);
    if (itemExistente) {
      itemExistente.qtd += this.quantidade;
    } else {
      this.carrinho.push({
        nome: this.produtoAtual.nome, precoStr: this.produtoAtual.preco,
        precoNum: this.produtoAtual.precoNum, tamanho: this.tamanhoSelecionado, qtd: this.quantidade
      });
    }
    this.fecharModalProduto();
    this.carrinhoPanelAtivo = true;
  }

  removerItem(index: number) { this.carrinho.splice(index, 1); }

  editarQuantidade(index: number) {
    this.popupInputValue = this.carrinho[index].qtd;
    this.mostrarPopup("Digite a nova quantidade:", true, true, () => {
      if (this.popupInputValue > 0) this.carrinho[index].qtd = this.popupInputValue;
      this.fecharPopup();
    });
  }

  esvaziarCarrinho() { this.carrinho = []; }

  get totalItensCarrinho() { return this.carrinho.reduce((acc, item) => acc + item.qtd, 0); }
  get valorTotalGeralFormatado() {
    const total = this.carrinho.reduce((acc, item) => acc + (item.precoNum * item.qtd), 0);
    return total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async finalizarCompra() {
    if(!this.usuarioLogado) {
        this.mostrarPopup("Faça login ou cadastre-se para finalizar a compra e informar o endereço de entrega.", false, false, () => {
            this.fecharPopup();
            this.carrinhoPanelAtivo = false;
            this.irPara('login');
        });
        return;
    }

    if (this.carrinho.length === 0) return;

    const itensComprados = JSON.parse(JSON.stringify(this.carrinho));
    const totalComprado = this.valorTotalGeralFormatado;

    this.pedidoRecente = {
      clienteEmail: this.usuarioLogado.email,
      enderecoEntrega: `${this.usuarioLogado.bairro}, Nº ${this.usuarioLogado.numero} ${this.usuarioLogado.comp ? '- Comp: ' + this.usuarioLogado.comp : ''}`,
      itens: itensComprados,
      totalFormatado: totalComprado,
      data: new Date().toISOString(),
      status: 'Aguardando Pagamento' 
    };

    this.carrinho = [];
    this.carrinhoPanelAtivo = false;
    this.irPara('comprovante');

    if (this.db) {
      try {
        const pedidosRef = collection(this.db, 'pedidos');
        await addDoc(pedidosRef, this.pedidoRecente);
      } catch (e) {
        console.error("Erro ao salvar pedido na nuvem: ", e);
      }
    }
  }

  mostrarPopup(mensagem: string, mostrarInput: boolean, mostrarCancel: boolean, acao: () => void) {
    this.popupMensagem = mensagem;
    this.popupInputVisible = mostrarInput;
    this.popupCancelVisible = mostrarCancel;
    this.acaoConfirmar = acao;
    this.popupAtivo = true;
    this.cdr.detectChanges();
  }
  fecharPopup() { this.popupAtivo = false; this.cdr.detectChanges(); }
  abrirAviso(tipo: string) {
    let msg = tipo === 'trocas' 
      ? "Você tem até 7 dias após o recebimento para solicitar troca."
      : "Entregas em até 24h úteis para toda Mombaça.";
    this.mostrarPopup(msg, false, false, () => this.fecharPopup());
  }
}