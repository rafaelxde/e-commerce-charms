import { Component, AfterViewChecked, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, updateDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';

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
  telaAtual: 'loja' | 'login' | 'comprovante' | 'historico' | 'produto' | 'admin' = 'loja';

  // ESTADOS DE AUTENTICAÇÃO E PERFIL
  modoAuth: 'login' | 'cadastro' = 'login';
  authEmail = '';
  authSenha = '';
  authTelefone = '';
  authBairro = '';
  authNumero = '';
  authComp = '';
  erroEmail = false;
  isAdmin = false; // Controle de acesso do admin

  // ESTADOS DO GOOGLE
  completandoCadastroGoogle = false;
  googleUserTemp: any = null;
  
  // VARIÁVEIS DE EDIÇÃO DE ENDEREÇO
  editandoEndereco = false;
  editTelefone = '';
  editBairro = '';
  editNumero = '';
  editComp = '';
  
  // ESTADOS DE DADOS
  usuarioLogado: any = null;
  pedidoRecente: any = null;
  historicoPedidos: any[] = [];
  carregandoHistorico = false;

  // ESTADO DO PAGAMENTO (PROTÓTIPO)
  metodoPagamentoSelecionado: 'pix' | 'cartao' = 'pix';

  // --- FILTROS DE CATEGORIA ---
  categorias = ['Todos', 'Blusa', 'Cropped', 'Calça', 'Shorts', 'Body', 'Vestido', 'Saia', 'Macacão', 'Conjunto'];
  categoriaSelecionada = 'Todos';
  termoBusca = '';

  // ARRAY VAZIO - AGORA LÊ DO BANCO DE DADOS
  produtos: any[] = [];
  tamanhosPadrao = ['PP', 'P', 'M', 'G', 'GG'];

  produtoAtual: any = null;
  fotoAtiva: string = ''; 
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

  // VARIÁVEIS DO ADMIN
  modoAdmin: 'lista' | 'formulario' = 'lista';
  termoBuscaAdmin = '';
  produtoEditandoId: number | null = null;

  // DADOS DO NOVO PRODUTO / EDIÇÃO (ADMIN)
  novoProduto = {
    nome: '',
    categoria: 'Blusa',
    precoAntigo: null as number | null,
    preco: null as number | null,
    img: '',
    fotosExtras: '', 
    tamanhos: 'PP, P, M, G, GG',
    estoque: 10
  };

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

        // --- O VIGIA DE LOGIN (Substitua o antigo por este aqui) ---
        onAuthStateChanged(this.auth, async (user: any) => {
          if (user && user.email) {
            this.fbUserUid = user.uid;
            
            // Busca os dados (bairro, telefone, isAdmin) no banco de dados
            const docRef = doc(this.db, 'usuarios', user.email);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              this.usuarioLogado = docSnap.data();
              this.isAdmin = this.usuarioLogado.isAdmin === true;
              
              // Se ele for admin e estiver na tela de login, manda direto para o painel
              if (this.isAdmin && this.telaAtual === 'login') {
                this.irPara('admin');
              }
            }
            this.cdr.detectChanges(); // Força o Angular a mostrar as informações na tela
          } else {
            // Se o Firebase disser que não tem ninguém, faz o login anônimo de fundo
            await signInAnonymously(this.auth);
          }
        });

        // Puxa os produtos do banco ao iniciar o site
        this.carregarProdutos();

      } else {
        console.warn('⚠️ As chaves do Firebase não foram preenchidas no código!');
      }
    } catch (e) {
      console.log('Erro ao iniciar Firebase.');
    }
  }

  ngAfterViewChecked() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // --- NOVA FUNÇÃO QUE LÊ DO BANCO ---
  async carregarProdutos() {
    if (this.db) {
      try {
        const produtosRef = collection(this.db, 'produtos');
        const querySnapshot = await getDocs(produtosRef);
        
        const produtosBanco: any[] = [];
        querySnapshot.forEach((doc) => {
          produtosBanco.push(doc.data());
        });

        // Organiza os produtos pelo ID para ficarem na ordem certinha
        produtosBanco.sort((a, b) => a.id - b.id);
        
        this.produtos = produtosBanco;
        this.cdr.detectChanges(); // Avisa a tela para atualizar
      } catch (e) {
        console.error("Erro ao buscar produtos do banco:", e);
      }
    }
  }

  filtrarPor(categoria: string) {
    this.categoriaSelecionada = categoria;
  }

  get produtosFiltrados() {
    let filtrados = this.produtos;

    if (this.termoBusca.trim() !== '') {
      const termo = this.termoBusca.toLowerCase().trim();
      const ehCategoriaExata = this.categorias.some(cat => cat.toLowerCase() === termo);

      if (ehCategoriaExata) {
        filtrados = filtrados.filter(p => p.categoria.toLowerCase() === termo);
      } else {
        filtrados = filtrados.filter(p =>
          p.nome.toLowerCase().includes(termo) ||
          p.categoria.toLowerCase().includes(termo)
        );
        
        if (this.categoriaSelecionada === 'Todos') {
          filtrados = filtrados.filter(p => !p.esconderNoTodos);
        } else {
          filtrados = filtrados.filter(p => p.categoria === this.categoriaSelecionada);
        }
      }
    }
    else {
      if (this.categoriaSelecionada === 'Todos') {
        filtrados = filtrados.filter(p => !p.esconderNoTodos);
      } else {
        filtrados = filtrados.filter(p => p.categoria === this.categoriaSelecionada);
      }
    }

    return filtrados;
  }

  get produtosAdminFiltrados() {
    if (this.termoBuscaAdmin.trim() === '') {
      return this.produtos;
    }
    const termo = this.termoBuscaAdmin.toLowerCase().trim();
    return this.produtos.filter(p => p.nome.toLowerCase().includes(termo) || p.categoria.toLowerCase().includes(termo));
  }

  irPara(tela: 'loja' | 'login' | 'comprovante' | 'historico' | 'produto' | 'admin') {
    this.telaAtual = tela;
    window.scrollTo(0,0);
    this.cdr.detectChanges();
  }

  alternarModoAuth() {
    this.modoAuth = this.modoAuth === 'login' ? 'cadastro' : 'login';
    this.authEmail = ''; this.authSenha = ''; this.authTelefone = ''; this.erroEmail = false;
  }

  validarEmail() {
    if (!this.authEmail) {
      this.erroEmail = false;
      return;
    }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.erroEmail = !regex.test(this.authEmail);
  }

  async loginComGoogle() {
    if (!this.auth) return;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;
      const email = user.email;

      if (this.db && email) {
        const docRef = doc(this.db, 'usuarios', email);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          this.usuarioLogado = docSnap.data();
          this.mostrarPopup("Login efetuado com sucesso!", false, false, () => {
            this.fecharPopup();
            this.irPara('loja');
          });
        } else {
          this.googleUserTemp = { email: email, nome: user.displayName };
          this.completandoCadastroGoogle = true;
          this.authTelefone = '';
          this.authBairro = '';
          this.authNumero = '';
          this.authComp = '';
          this.cdr.detectChanges();
        }
      }
    } catch (error) {
      console.error("Erro no login com Google", error);
      this.mostrarPopup("Erro ao conectar com o Google.", false, false, () => this.fecharPopup());
    }
  }

  async finalizarCadastroGoogle() {
    if (!this.authBairro || !this.authNumero || !this.authTelefone) {
      this.mostrarPopup("Telefone, Bairro e Número são obrigatórios.", false, false, () => this.fecharPopup());
      return;
    }

    const novoUsuario = {
      email: this.googleUserTemp.email,
      senha: 'google-login',
      telefone: this.authTelefone,
      bairro: this.authBairro,
      numero: this.authNumero,
      comp: this.authComp
    };

    if (this.db) {
      const docRef = doc(this.db, 'usuarios', novoUsuario.email);
      await setDoc(docRef, novoUsuario);
    }

    this.usuarioLogado = novoUsuario;
    this.completandoCadastroGoogle = false;
    this.googleUserTemp = null;
    
    this.mostrarPopup("Conta criada com sucesso! Bem-vinda à Charm's.", false, false, () => {
      this.fecharPopup();
      this.irPara('loja');
    });
  }

  async executarAuth() {
    this.validarEmail();
    
    if (this.erroEmail || !this.authEmail || !this.authSenha) {
      this.mostrarPopup("Preencha o e-mail e a senha corretamente.", false, false, () => this.fecharPopup());
      return;
    }

    if (this.modoAuth === 'cadastro') {
      if (!this.authBairro || !this.authNumero || !this.authTelefone) {
        this.mostrarPopup("Telefone, Bairro e Número são obrigatórios.", false, false, () => this.fecharPopup());
        return;
      }

      try {
        await createUserWithEmailAndPassword(this.auth, this.authEmail, this.authSenha);

        const novoUsuario = {
          email: this.authEmail,
          telefone: this.authTelefone,
          bairro: this.authBairro,
          numero: this.authNumero,
          comp: this.authComp,
          isAdmin: false
        };
        
        if (this.db) {
          const docRef = doc(this.db, 'usuarios', this.authEmail);
          await setDoc(docRef, novoUsuario);
        }
        
        this.usuarioLogado = novoUsuario;
        this.mostrarPopup("Conta criada com sucesso! Bem-vinda à Charm's.", false, false, () => {
          this.fecharPopup();
          this.irPara('loja');
        });

      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          this.mostrarPopup("Este e-mail já está cadastrado. Vá em 'Fazer login'.", false, false, () => this.fecharPopup());
        } else if (error.code === 'auth/weak-password') {
          this.mostrarPopup("A senha deve ter pelo menos 6 caracteres.", false, false, () => this.fecharPopup());
        } else {
          this.mostrarPopup("Erro ao criar conta. Tente novamente.", false, false, () => this.fecharPopup());
          console.error(error);
        }
      }

    } else {
      if (this.db) {
        try {
          await signInWithEmailAndPassword(this.auth, this.authEmail, this.authSenha);
          
          const docRef = doc(this.db, 'usuarios', this.authEmail);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const dadosUsuario = docSnap.data();
            this.usuarioLogado = dadosUsuario;
            
            this.isAdmin = dadosUsuario['isAdmin'] === true;

            if (this.isAdmin) {
              this.modoAdmin = 'lista';
              this.mostrarPopup("Bem-vindo ao Painel de Administrador!", false, false, () => {
                this.fecharPopup();
                this.irPara('admin');
              });
            } else {
              this.mostrarPopup("Login efetuado com sucesso!", false, false, () => {
                this.fecharPopup();
                this.irPara('loja');
              });
            }
          } else {
              this.mostrarPopup("Erro ao carregar perfil do cliente.", false, false, () => this.fecharPopup());
          }

        } catch (error: any) {
          this.mostrarPopup("E-mail ou senha incorretos.", false, false, () => this.fecharPopup());
          console.error("Erro de login:", error);
        }
      } else {
          this.mostrarPopup("Erro de conexão com o servidor.", false, false, () => this.fecharPopup());
      }
    }
  }

  fazerLogout() {
    this.usuarioLogado = null;
    this.isAdmin = false;
    this.authEmail = '';
    this.authSenha = '';
    this.authTelefone = '';
    this.modoAuth = 'login';
    this.completandoCadastroGoogle = false;
    this.googleUserTemp = null;
    this.mostrarPopup("Você saiu da sua conta.", false, false, () => {
       this.fecharPopup();
       this.irPara('loja');
    });
  }

  iniciarEdicaoEndereco() {
    this.editTelefone = this.usuarioLogado.telefone || '';
    this.editBairro = this.usuarioLogado.bairro;
    this.editNumero = this.usuarioLogado.numero;
    this.editComp = this.usuarioLogado.comp || '';
    this.editandoEndereco = true;
  }

  async salvarEndereco() {
    if (!this.editBairro || !this.editNumero || !this.editTelefone) {
      this.mostrarPopup("Telefone, Bairro e Número são obrigatórios.", false, false, () => this.fecharPopup());
      return;
    }

    this.usuarioLogado.telefone = this.editTelefone;
    this.usuarioLogado.bairro = this.editBairro;
    this.usuarioLogado.numero = this.editNumero;
    this.usuarioLogado.comp = this.editComp;
    this.editandoEndereco = false;

    if (this.db && !this.isAdmin) {
      try {
        const docRef = doc(this.db, 'usuarios', this.usuarioLogado.email);
        await updateDoc(docRef, {
          telefone: this.editTelefone,
          bairro: this.editBairro,
          numero: this.editNumero,
          comp: this.editComp
        });
        this.mostrarPopup("Endereço atualizado com sucesso!", false, false, () => this.fecharPopup());
      } catch (e) {
        console.error("Erro ao atualizar o endereço no banco:", e);
      }
    } else if (this.isAdmin) {
        this.mostrarPopup("Endereço atualizado temporariamente (Admin).", false, false, () => this.fecharPopup());
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

  abrirPaginaProduto(produto: any) {
    this.produtoAtual = produto;
    this.fotoAtiva = produto.img;
    this.quantidade = 1;
    this.tamanhoSelecionado = null;
    this.irPara('produto');
  }

  mudarFotoAtiva(novaUrl: string) {
    this.fotoAtiva = novaUrl;
  }

  selecionarTamanho(tamanho: string) { this.tamanhoSelecionado = tamanho; }
  
  alterarQuantidade(valor: number) { 
    if (this.quantidade + valor > 0) {
      const estoqueAtual = this.produtoAtual.estoque || 0;
      if (this.quantidade + valor <= estoqueAtual) {
         this.quantidade += valor; 
      } else {
         this.mostrarPopup(`Desculpe, temos apenas ${estoqueAtual} em estoque.`, false, false, () => this.fecharPopup());
      }
    } 
  }

  adicionarAoCarrinho() {
    if (!this.tamanhoSelecionado) {
      this.mostrarPopup("Por favor, selecione um tamanho.", false, false, () => this.fecharPopup());
      return;
    }
    
    if (this.quantidade > (this.produtoAtual.estoque || 0)) {
        this.mostrarPopup(`Estoque insuficiente. Temos apenas ${this.produtoAtual.estoque} peças.`, false, false, () => this.fecharPopup());
        return;
    }

    const itemExistente = this.carrinho.find(item => item.id === this.produtoAtual.id && item.tamanho === this.tamanhoSelecionado);
    if (itemExistente) {
      if (itemExistente.qtd + this.quantidade > (this.produtoAtual.estoque || 0)) {
          this.mostrarPopup(`Você já tem esse item na sacola e a quantidade total excederia nosso estoque de ${this.produtoAtual.estoque} peças.`, false, false, () => this.fecharPopup());
          return;
      }
      itemExistente.qtd += this.quantidade;
    } else {
      this.carrinho.push({
        id: this.produtoAtual.id,
        nome: this.produtoAtual.nome,
        precoStr: this.produtoAtual.preco,
        precoNum: this.produtoAtual.precoNum,
        tamanho: this.tamanhoSelecionado,
        qtd: this.quantidade
      });
    }
    
    this.carrinhoPanelAtivo = true;
  }

  removerItem(index: number) { this.carrinho.splice(index, 1); }

  editarQuantidade(index: number) {
    this.popupInputValue = this.carrinho[index].qtd;
    this.mostrarPopup("Digite a nova quantidade:", true, true, () => {
      const novaQtd = this.popupInputValue;
      if (novaQtd > 0) {
         const prodOriginal = this.produtos.find(p => p.id === this.carrinho[index].id);
         if (prodOriginal && novaQtd > prodOriginal.estoque) {
             this.mostrarPopup(`Temos apenas ${prodOriginal.estoque} unidades deste item.`, false, false, () => this.fecharPopup());
         } else {
             this.carrinho[index].qtd = novaQtd;
             this.fecharPopup();
         }
      } else {
         this.fecharPopup();
      }
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
      clienteTelefone: this.usuarioLogado.telefone,
      enderecoEntrega: `${this.usuarioLogado.bairro}, Nº ${this.usuarioLogado.numero} ${this.usuarioLogado.comp ? '- Comp: ' + this.usuarioLogado.comp : ''}`,
      itens: itensComprados,
      totalFormatado: totalComprado,
      data: new Date().toISOString(),
      status: 'Aguardando Pagamento'
    };

    // ABATE DO ESTOQUE
    for (let itemCarrinho of this.carrinho) {
        let produtoEncontrado = this.produtos.find(p => p.id === itemCarrinho.id);
        if (produtoEncontrado) {
            produtoEncontrado.estoque -= itemCarrinho.qtd;
            if(produtoEncontrado.estoque < 0) produtoEncontrado.estoque = 0;
            
            // NOVIDADE: Atualiza o estoque abatido direto no banco de dados!
            if(this.db) {
                try {
                  const prodRef = doc(this.db, 'produtos', produtoEncontrado.id.toString());
                  await updateDoc(prodRef, { estoque: produtoEncontrado.estoque });
                } catch(e) { console.error("Erro ao abater estoque:", e); }
            }
        }
    }

    this.carrinho = [];
    this.carrinhoPanelAtivo = false;
    // Garante que a tela sempre inicie na aba PIX ao chegar no comprovante
    this.metodoPagamentoSelecionado = 'pix';
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

  // --- SIMULAÇÃO DO PAGAMENTO ---
  simularPagamento() {
    this.mostrarPopup("Processando pagamento... (Simulação)", false, false, () => {
      this.pedidoRecente.status = 'Pagamento Aprovado';
      this.fecharPopup();
    });
  }


  // ==========================================
  // FUNÇÕES DO PAINEL DO ADMINISTRADOR
  // ==========================================
  
  abrirCadastroAdmin() {
    this.modoAdmin = 'formulario';
    this.produtoEditandoId = null;
    this.novoProduto = {
      nome: '', categoria: 'Blusa', precoAntigo: null, preco: null,
      img: '', fotosExtras: '', tamanhos: 'PP, P, M, G, GG', estoque: 10
    };
  }

  abrirEdicaoAdmin(produto: any) {
    this.modoAdmin = 'formulario';
    this.produtoEditandoId = produto.id;
    this.novoProduto = {
      nome: produto.nome,
      categoria: produto.categoria,
      precoAntigo: produto.precoAntigo ? parseFloat(produto.precoAntigo.replace('R$ ', '').replace(',', '.')) : null,
      preco: produto.precoNum,
      img: produto.img,
      fotosExtras: (produto.fotosExtras && produto.fotosExtras.length > 0) ? produto.fotosExtras.join(', ') : '',
      tamanhos: produto.tamanhos ? produto.tamanhos.join(', ') : 'PP, P, M, G, GG',
      estoque: produto.estoque !== undefined ? produto.estoque : 10
    };
  }

  voltarParaListaAdmin() {
    this.modoAdmin = 'lista';
    this.produtoEditandoId = null;
  }

  async salvarProduto() {
    if (!this.novoProduto.nome || !this.novoProduto.preco || !this.novoProduto.img || !this.novoProduto.tamanhos) {
      this.mostrarPopup("Preencha o nome, preço, URL da foto e tamanhos.", false, false, () => this.fecharPopup());
      return;
    }

    const precoFormatado = `R$ ${this.novoProduto.preco.toFixed(2).replace('.', ',')}`;
    const precoAntigoFormatado = this.novoProduto.precoAntigo ? `R$ ${this.novoProduto.precoAntigo.toFixed(2).replace('.', ',')}` : '';
    const tamanhosArray = this.novoProduto.tamanhos.split(',').map(t => t.trim()).filter(t => t !== '');
    
    const fotosExtrasArray = this.novoProduto.fotosExtras.split(',')
                                .map(f => f.trim())
                                .filter(f => f !== '' && f !== null);

    if (this.produtoEditandoId !== null) {
      const index = this.produtos.findIndex(p => p.id === this.produtoEditandoId);
      if (index !== -1) {
        this.produtos[index].nome = this.novoProduto.nome;
        this.produtos[index].categoria = this.novoProduto.categoria;
        this.produtos[index].precoAntigo = precoAntigoFormatado;
        this.produtos[index].preco = precoFormatado;
        this.produtos[index].precoNum = this.novoProduto.preco;
        this.produtos[index].img = this.novoProduto.img;
        this.produtos[index].fotosExtras = fotosExtrasArray;
        this.produtos[index].tamanhos = tamanhosArray;
        this.produtos[index].estoque = this.novoProduto.estoque;
        
        // SALVA A EDIÇÃO DE VERDADE NO BANCO
        if (this.db) {
           const docRef = doc(this.db, 'produtos', this.produtoEditandoId.toString());
           await updateDoc(docRef, this.produtos[index]);
        }
      }
      this.mostrarPopup("Produto atualizado com sucesso no banco de dados!", false, false, () => {
        this.fecharPopup();
        this.voltarParaListaAdmin();
      });

    } else {
      const novoId = this.produtos.length > 0 ? Math.max(...this.produtos.map(p => p.id)) + 1 : 1;
      const prod = {
        id: novoId,
        nome: this.novoProduto.nome,
        categoria: this.novoProduto.categoria,
        precoAntigo: precoAntigoFormatado,
        preco: precoFormatado,
        precoNum: this.novoProduto.preco,
        img: this.novoProduto.img,
        fotosExtras: fotosExtrasArray,
        esconderNoTodos: false,
        tamanhos: tamanhosArray,
        estoque: this.novoProduto.estoque
      };

      this.produtos.unshift(prod);
      
      // SALVA O PRODUTO NOVO DE VERDADE NO BANCO
      if (this.db) {
         const docRef = doc(this.db, 'produtos', novoId.toString());
         await setDoc(docRef, prod);
      }

      this.mostrarPopup("Produto cadastrado e salvo no banco de dados!", false, false, () => {
        this.fecharPopup();
        this.voltarParaListaAdmin();
      });
    }
  }

  excluirProduto(id: number) {
     this.mostrarPopup("Tem certeza que deseja excluir este produto permanentemente?", false, true, async () => {
         this.produtos = this.produtos.filter(p => p.id !== id);
         
         // EXCLUI DE VERDADE DO BANCO DE DADOS
         if(this.db) {
             const docRef = doc(this.db, 'produtos', id.toString());
             await deleteDoc(docRef);
         }

         this.fecharPopup();
     });
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