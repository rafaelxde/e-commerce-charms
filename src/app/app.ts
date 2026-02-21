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
  private titleService = inject(Title); // <--- ADICIONADO PARA SEO
  private metaService = inject(Meta);   // <--- ADICIONADO PARA SEO

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
  categorias = ['Todos', 'Blusa', 'Cropped', 'Calça', 'Shorts', 'Body', 'Vestido', 'Conjunto', 'Saia'];
  categoriaSelecionada = 'Todos';

  // IMAGENS E COLEÇÃO FICTÍCIA AMPLIADA (Com categoria adicionada)
  produtos = [
    { nome: "Vestido Tropical Breeze", categoria: "Vestido", precoAntigo: "R$ 204,90", preco: "R$ 189,90", precoNum: 189.90, img: "/img/vestido_tropical.jpg" },
    { nome: "Conjunto Linho Off-White", categoria: "Conjunto", precoAntigo: "R$ 239,90", preco: "R$ 229,90", precoNum: 229.90, img: "/img/conjunto_linho.jpg" },
    { nome: "Saia Midi Estampa Floral", categoria: "Saia", precoAntigo: "R$ 189,90", preco: "R$ 159,90", precoNum: 159.90, img: "/img/saia_midi.jpg" },
    { nome: "Blusa Cropped Amarração", categoria: "Cropped", precoAntigo: "R$ 149,90", preco: "R$ 119,90", precoNum: 119.90, img: "/img/cropped_amarracao.jpg" },
    { nome: "Calça Pantalona Areia", categoria: "Calça", precoAntigo: "R$ 269,90", preco: "R$ 249,90", precoNum: 249.90, img: "/img/calca_pantalona.jpg" },
    { nome: "Vestido Longo Pôr do Sol", categoria: "Vestido", precoAntigo: "R$ 294,90", preco: "R$ 279,90", precoNum: 279.90, img: "/img/vestido_longo.jpg" },
    { nome: "Macacão Viscose Leve", categoria: "Body", precoAntigo: "R$ 239,90", preco: "R$ 219,90", precoNum: 219.90, img: "/img/macacao.jpg" },
    { nome: "Shorts Alfaiataria Cinto", categoria: "Shorts", precoAntigo: "R$ 159,90", preco: "R$ 139,90", precoNum: 139.90, img: "/img/shorts_alfaiataria.jpg" }
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

  // COLOQUE SUAS CHAVES DO FIREBASE AQUI
  private firebaseConfig = {
    apiKey: "AIzaSyDMlwDoXM0hRIix8K4CXmPeJahrAVud7LA",
    authDomain: "loja-charms.firebaseapp.com",
    projectId: "loja-charms",
    storageBucket: "loja-charms.firebasestorage.app",
    messagingSenderId: "76109586584",
    appId: "1:76109586584:web:25403a6853fbe5bc9df0ed"
  };

  async ngOnInit() {
    // --- INÍCIO CONFIGURAÇÃO SEO ---
    this.titleService.setTitle("Charm's MV Confecções | Moda Feminina");
    this.metaService.addTags([
      { name: 'description', content: 'Fábrica Charm\'s em Mombaça. Peças femininas que unem elegância, conforto e durabilidade real. Conheça nossa coleção.' },
      { name: 'keywords', content: 'moda feminina, roupas femininas, mombaça, vestido, confecção, fábrica de roupas' },
      { name: 'robots', content: 'index, follow' }
    ]);
    // --- FIM CONFIGURAÇÃO SEO ---

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
      return this.produtos;
    }
    return this.produtos.filter(p => p.categoria === this.categoriaSelecionada);
  }
  // ---------------------------

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

  // --- MÉTODOS DE EDIÇÃO DE ENDEREÇO ---
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

    // Atualiza localmente
    this.usuarioLogado.bairro = this.editBairro;
    this.usuarioLogado.numero = this.editNumero;
    this.usuarioLogado.comp = this.editComp;
    this.editandoEndereco = false;

    // Atualiza no Banco de Dados (Firebase)
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

  // --- MÉTODOS DO HISTÓRICO DE COMPRAS ---
  async abrirHistorico() {
    if (!this.usuarioLogado) return;
    this.irPara('historico');
    this.carregandoHistorico = true;
    this.historicoPedidos = [];

    if (this.db) {
      try {
        // Busca todos os pedidos onde o e-mail do cliente é igual ao e-mail logado
        const pedidosRef = collection(this.db, 'pedidos');
        const q = query(pedidosRef, where("clienteEmail", "==", this.usuarioLogado.email));
        const querySnapshot = await getDocs(q);
        
        const pedidosEncontrados: any[] = [];
        querySnapshot.forEach((doc) => {
          pedidosEncontrados.push({ id: doc.id, ...doc.data() });
        });

        // Ordena para os mais recentes ficarem no topo da lista
        pedidosEncontrados.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        
        this.historicoPedidos = pedidosEncontrados;
      } catch (e) {
        console.error("Erro ao buscar histórico:", e);
      }
    }
    this.carregandoHistorico = false;
    this.cdr.detectChanges();
  }

  // --- MÉTODOS DE PRODUTO E CARRINHO ---
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