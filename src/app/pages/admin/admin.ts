import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../core/state';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html'
})
export class AdminComponent implements OnInit {
  public state = inject(StateService);
  private router = inject(Router);
  
  // INJETANDO O ATUALIZADOR DE TELA AQUI
  private cdr = inject(ChangeDetectorRef);

  categorias = ['Todos', 'Blusa', 'Cropped', 'Calça', 'Shorts', 'Body', 'Vestido', 'Saia', 'Macacão', 'Conjunto'];
  
  modoAdmin: 'lista' | 'formulario' = 'lista';
  termoBuscaAdmin = '';
  produtoEditandoId: number | null = null;
  
  carregandoImagem = false;
  
  salvando = false;
  mensagemErro = '';
  mensagemSucesso = '';
  confirmarExclusaoId: number | null = null;

  novoProduto: any = {
    nome: '', categoria: 'Blusa', precoAntigo: null, preco: null, precosTamanho: {},
    img: '', fotosExtras: '', tamanhos: 'PP, P, M, G, GG', estoque: 10
  };

  ngOnInit() {
    if (!this.state.isAdmin) {
      this.router.navigate(['/']);
    }
  }

  get produtosAdminFiltrados() {
    if (this.termoBuscaAdmin.trim() === '') return this.state.produtos;
    const termo = this.termoBuscaAdmin.toLowerCase().trim();
    return this.state.produtos.filter(p => p.nome.toLowerCase().includes(termo) || p.categoria.toLowerCase().includes(termo));
  }

  get tamanhosArrayAdmin() {
    if (!this.novoProduto.tamanhos) return [];
    return this.novoProduto.tamanhos.split(',').map((t: string) => t.trim()).filter((t: string) => t !== '');
  }

  abrirCadastroAdmin() {
    this.modoAdmin = 'formulario';
    this.produtoEditandoId = null;
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    this.novoProduto = {
      nome: '', categoria: 'Blusa', precoAntigo: null, preco: null, precosTamanho: {},
      img: '', fotosExtras: '', tamanhos: 'PP, P, M, G, GG', estoque: 10
    };
  }

  abrirEdicaoAdmin(produto: any) {
    this.modoAdmin = 'formulario';
    this.produtoEditandoId = produto.id;
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    this.novoProduto = {
      nome: produto.nome,
      categoria: produto.categoria,
      precoAntigo: produto.precoAntigo ? parseFloat(produto.precoAntigo.replace('R$ ', '').replace('.', '').replace(',', '.')) : null,
      preco: produto.precoNum,
      precosTamanho: produto.precosTamanho ? { ...produto.precosTamanho } : {},
      img: produto.img,
      fotosExtras: (produto.fotosExtras && produto.fotosExtras.length > 0) ? produto.fotosExtras.join(', ') : '',
      tamanhos: produto.tamanhos ? produto.tamanhos.join(', ') : 'PP, P, M, G, GG',
      estoque: produto.estoque !== undefined ? produto.estoque : 10
    };
  }

  voltarParaListaAdmin() {
    this.modoAdmin = 'lista';
    this.produtoEditandoId = null;
    this.mensagemErro = '';
    this.mensagemSucesso = '';
  }

  async uploadImagem(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.carregandoImagem = true;
    this.mensagemErro = '';
    
    const storageRef = ref(this.state.storage, `produtos/${Date.now()}_${file.name}`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      this.novoProduto.img = url;
    } catch (error) {
      console.error(error);
      this.mensagemErro = "Erro ao enviar imagem. Verifique a conexão.";
    } finally {
      this.carregandoImagem = false;
      this.cdr.detectChanges(); // Força a tela a atualizar
    }
  }

  async salvarProduto() {
    this.mensagemErro = '';
    
    if (!this.novoProduto.nome || !this.novoProduto.preco || !this.novoProduto.img || !this.novoProduto.tamanhos) {
      this.mensagemErro = "Preencha o nome, preço base, foto do produto e tamanhos.";
      return;
    }

    this.salvando = true;

    try {
      const tamanhosArray = this.tamanhosArrayAdmin;
      const precosFinais: any = {};
      let menorPreco = Infinity;
      let precosDiferentes = false;
      let primeiroPreco: number | null = null;

      tamanhosArray.forEach((t: string) => {
        let precoTam = this.novoProduto.precosTamanho[t];
        if (precoTam === undefined || precoTam === null || precoTam === '') {
           precoTam = this.novoProduto.preco; 
        }
        // Corrige problemas caso a pessoa digite vírgula no preço
        if (typeof precoTam === 'string') {
          precoTam = parseFloat(precoTam.replace(',', '.'));
        } else {
          precoTam = parseFloat(precoTam);
        }
        
        precosFinais[t] = precoTam;

        if (primeiroPreco === null) primeiroPreco = precoTam;
        else if (primeiroPreco !== precoTam) precosDiferentes = true;

        if (precoTam < menorPreco) menorPreco = precoTam;
      });

      if (menorPreco === Infinity) menorPreco = parseFloat(this.novoProduto.preco.toString().replace(',', '.')) || 0;

      let precoFormatado = `R$ ${menorPreco.toFixed(2).replace('.', ',')}`;
      if (precosDiferentes) precoFormatado = `A partir de ${precoFormatado}`;

      const precoAntigoFormatado = this.novoProduto.precoAntigo ? `R$ ${parseFloat(this.novoProduto.precoAntigo.toString().replace(',', '.')).toFixed(2).replace('.', ',')}` : '';
      const fotosExtrasArray = this.novoProduto.fotosExtras.split(',').map((f: string) => f.trim()).filter((f: string) => f !== '' && f !== null);

      if (this.produtoEditandoId !== null) {
        const index = this.state.produtos.findIndex(p => p.id === this.produtoEditandoId);
        if (index !== -1) {
          this.state.produtos[index].nome = this.novoProduto.nome;
          this.state.produtos[index].categoria = this.novoProduto.categoria;
          this.state.produtos[index].precoAntigo = precoAntigoFormatado;
          this.state.produtos[index].preco = precoFormatado;
          this.state.produtos[index].precoNum = menorPreco;
          this.state.produtos[index].precosTamanho = precosFinais;
          this.state.produtos[index].img = this.novoProduto.img;
          this.state.produtos[index].fotosExtras = fotosExtrasArray;
          this.state.produtos[index].tamanhos = tamanhosArray;
          this.state.produtos[index].estoque = this.novoProduto.estoque;
          
          if (this.state.db) {
             await updateDoc(doc(this.state.db, 'produtos', this.produtoEditandoId.toString()), this.state.produtos[index]);
          }
        }
        this.mensagemSucesso = "Produto atualizado com sucesso!";
      } else {
        const novoId = this.state.produtos.length > 0 ? Math.max(...this.state.produtos.map(p => p.id)) + 1 : 1;
        const prod = {
          id: novoId, nome: this.novoProduto.nome, categoria: this.novoProduto.categoria,
          precoAntigo: precoAntigoFormatado, preco: precoFormatado, precoNum: menorPreco, precosTamanho: precosFinais,
          img: this.novoProduto.img, fotosExtras: fotosExtrasArray, esconderNoTodos: false,
          tamanhos: tamanhosArray, estoque: this.novoProduto.estoque
        };

        this.state.produtos.unshift(prod);
        if (this.state.db) {
          await setDoc(doc(this.state.db, 'produtos', novoId.toString()), prod);
        }
        this.mensagemSucesso = "Produto cadastrado com sucesso!";
      }

      setTimeout(() => {
        this.salvando = false;
        this.voltarParaListaAdmin();
        this.cdr.detectChanges(); // Força a tela a atualizar
      }, 1500);

    } catch (error: any) {
      console.error("Erro do Firebase:", error);
      
      // MOSTRA O ERRO NA TELA E DESTRAVA O BOTÃO
      this.salvando = false; 
      this.mensagemErro = "Erro ao salvar: Permissão negada pelas regras do Firebase.";
      this.cdr.detectChanges(); // Força a tela a atualizar para exibir o erro!
    }
  }

  async excluirProduto(id: number) {
    if (this.confirmarExclusaoId === id) {
      try {
        if(this.state.db) {
          await deleteDoc(doc(this.state.db, 'produtos', id.toString()));
        }
        this.state.produtos = this.state.produtos.filter(p => p.id !== id);
        this.confirmarExclusaoId = null;
        this.cdr.detectChanges();
      } catch(error) {
        console.error("Erro do Firebase ao excluir:", error);
        this.mensagemErro = "Erro ao excluir: Permissão negada.";
        this.confirmarExclusaoId = null;
        this.cdr.detectChanges();
      }
    } else {
      this.confirmarExclusaoId = id; 
      setTimeout(() => {
        if (this.confirmarExclusaoId === id) {
          this.confirmarExclusaoId = null;
          this.cdr.detectChanges();
        }
      }, 3000);
    }
  }

  irPara(rota: string) {
    this.router.navigate([rota]);
  }
}