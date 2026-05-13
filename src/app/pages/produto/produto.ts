import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StateService } from '../../core/state';

@Component({
  selector: 'app-produto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './produto.html'
})
export class ProdutoComponent {
  public state = inject(StateService);
  private router = inject(Router);

  fotoAtiva: string = '';
  tamanhoSelecionado: string | null = null;
  quantidade = 1;
  tamanhosPadrao = ['PP', 'P', 'M', 'G', 'GG'];

  ngOnInit() {
    // Se não tiver produto selecionado, volta pra loja
    if (!this.state.produtoAtual) {
      this.router.navigate(['/']);
      return;
    }
    this.fotoAtiva = this.state.produtoAtual.img;
  }

  mudarFotoAtiva(novaUrl: string) {
    this.fotoAtiva = novaUrl;
  }

  selecionarTamanho(tamanho: string) { 
    this.tamanhoSelecionado = tamanho; 
    
    if (this.state.produtoAtual.precosTamanho && this.state.produtoAtual.precosTamanho[tamanho] !== undefined) {
      const precoEspecifico = parseFloat(this.state.produtoAtual.precosTamanho[tamanho]);
      this.state.produtoAtual.precoExibicao = `R$ ${precoEspecifico.toFixed(2).replace('.', ',')}`;
    } else {
      this.state.produtoAtual.precoExibicao = `R$ ${this.state.produtoAtual.precoNum.toFixed(2).replace('.', ',')}`;
    }
  }
  
  alterarQuantidade(valor: number) { 
    if (this.quantidade + valor > 0) {
      const estoqueAtual = this.state.produtoAtual.estoque || 0;
      if (this.quantidade + valor <= estoqueAtual) {
         this.quantidade += valor; 
      } else {
         alert(`Desculpe, temos apenas ${estoqueAtual} em estoque.`);
      }
    } 
  }

  adicionarAoCarrinho() {
    if (!this.tamanhoSelecionado) {
      alert("Por favor, selecione um tamanho.");
      return;
    }
    
    if (this.quantidade > (this.state.produtoAtual.estoque || 0)) {
        alert(`Estoque insuficiente. Temos apenas ${this.state.produtoAtual.estoque} peças.`);
        return;
    }

    let precoItemNum = this.state.produtoAtual.precoNum;
    if (this.state.produtoAtual.precosTamanho && this.state.produtoAtual.precosTamanho[this.tamanhoSelecionado] !== undefined) {
        precoItemNum = parseFloat(this.state.produtoAtual.precosTamanho[this.tamanhoSelecionado]);
    }

    const itemExistente = this.state.carrinho.find(item => item.id === this.state.produtoAtual.id && item.tamanho === this.tamanhoSelecionado);
    if (itemExistente) {
      if (itemExistente.qtd + this.quantidade > (this.state.produtoAtual.estoque || 0)) {
          alert(`Quantidade excederia nosso estoque.`);
          return;
      }
      itemExistente.qtd += this.quantidade;
    } else {
      this.state.carrinho.push({
        id: this.state.produtoAtual.id,
        nome: this.state.produtoAtual.nome,
        precoStr: `R$ ${precoItemNum.toFixed(2).replace('.', ',')}`,
        precoNum: precoItemNum,
        tamanho: this.tamanhoSelecionado,
        qtd: this.quantidade
      });
    }
    
    this.state.carrinhoPanelAtivo = true;
  }

  voltarParaLoja() {
    this.router.navigate(['/']);
    window.scrollTo(0,0);
  }
}