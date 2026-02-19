import { Component, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare var lucide: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['../styles.css'] // ou './app.css' dependendo de como está no seu projeto
})
export class AppComponent implements AfterViewChecked {
  // Lista de Produtos idêntica à do seu HTML
  produtos = [
    { nome: "Vestido Tropical Charm's", preco: "R$ 189,90", precoNum: 189.90, img: "img/produto1.jpg" },
    { nome: "Conjunto Linho Summer", preco: "R$ 229,90", precoNum: 229.90, img: "img/produto2.jpg" },
    { nome: "Conjunto Saia para Praia", preco: "R$ 159,90", precoNum: 159.90, img: "img/produto3.jpg" },
    { nome: "Conjunto Exemplo 4", preco: "R$ 279,90", precoNum: 279.90, img: "img/produto4.jpg" }
  ];

  tamanhos = ['PP', 'P', 'M', 'G', 'GG'];

  // Estados do Modal de Produto
  modalAtivo = false;
  produtoAtual: any = null;
  tamanhoSelecionado: string | null = null;
  quantidade = 1;

  // Estados do Carrinho
  carrinhoPanelAtivo = false;
  carrinho: any[] = [];

  // Estados do Popup Customizado
  popupAtivo = false;
  popupMensagem = '';
  popupInputVisible = false;
  popupCancelVisible = false;
  popupInputValue: number = 1;
  acaoConfirmar: () => void = () => {};

  // Atualiza os ícones do Lucide sempre que a tela mudar
  ngAfterViewChecked() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // --- MÉTODOS DE PRODUTO ---
  abrirModalProduto(produto: any) {
    this.produtoAtual = produto;
    this.quantidade = 1;
    this.tamanhoSelecionado = null;
    this.modalAtivo = true;
  }

  fecharModalProduto() {
    this.modalAtivo = false;
  }

  selecionarTamanho(tamanho: string) {
    this.tamanhoSelecionado = tamanho;
  }

  alterarQuantidade(valor: number) {
    if (this.quantidade + valor > 0) {
      this.quantidade += valor;
    }
  }

  // --- MÉTODOS DO CARRINHO ---
  adicionarAoCarrinho() {
    if (!this.tamanhoSelecionado) {
      this.mostrarPopup("Por favor, selecione um tamanho.", false, false, () => {
        this.fecharPopup();
      });
      return;
    }

    const itemExistente = this.carrinho.find(item => 
      item.nome === this.produtoAtual.nome && item.tamanho === this.tamanhoSelecionado
    );

    if (itemExistente) {
      itemExistente.qtd += this.quantidade;
    } else {
      this.carrinho.push({
        nome: this.produtoAtual.nome,
        precoStr: this.produtoAtual.preco,
        precoNum: this.produtoAtual.precoNum,
        tamanho: this.tamanhoSelecionado,
        qtd: this.quantidade
      });
    }

    this.fecharModalProduto();
  }

  removerItem(index: number) {
    this.mostrarPopup("Deseja realmente remover este item da sacola?", false, true, () => {
      this.carrinho.splice(index, 1);
      this.fecharPopup();
    });
  }

  editarQuantidade(index: number) {
    this.popupInputValue = this.carrinho[index].qtd;
    this.mostrarPopup("Digite a nova quantidade:", true, true, () => {
      if (this.popupInputValue > 0) {
        this.carrinho[index].qtd = this.popupInputValue;
      }
      this.fecharPopup();
    });
  }

  esvaziarCarrinho() {
    if (this.carrinho.length === 0) return;
    this.mostrarPopup("Deseja esvaziar toda a sacola?", false, true, () => {
      this.carrinho = [];
      this.fecharPopup();
    });
  }

  get totalItensCarrinho() {
    return this.carrinho.reduce((acc, item) => acc + item.qtd, 0);
  }

  // Mantém a formatação de dinheiro exata que você usava no JS bruto
  get valorTotalGeralFormatado() {
    const total = this.carrinho.reduce((acc, item) => acc + (item.precoNum * item.qtd), 0);
    return total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  finalizarCompra() {
    alert("Pedido enviado! (Simulação)");
  }

  // --- MÉTODOS DO POPUP ---
  mostrarPopup(mensagem: string, mostrarInput: boolean, mostrarCancel: boolean, acao: () => void) {
    this.popupMensagem = mensagem;
    this.popupInputVisible = mostrarInput;
    this.popupCancelVisible = mostrarCancel;
    this.acaoConfirmar = acao;
    this.popupAtivo = true;
  }

  fecharPopup() {
    this.popupAtivo = false;
  }

  abrirAviso(tipo: string) {
    let msg = tipo === 'trocas' 
      ? "Nossa política de trocas e devoluções garante sua satisfação. Você tem até 7 dias após o recebimento para solicitar troca ou devolução."
      : "Realizamos entregas para toda Mombaça, com até 24h úteis para entrega.";
    
    this.mostrarPopup(msg, false, false, () => this.fecharPopup());
  }
}