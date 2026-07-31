import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../core/state';

@Component({
  selector: 'app-loja',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loja.html'
})
export class LojaComponent implements OnInit {
  public state = inject(StateService);
  private router = inject(Router);

  // Ferramenta que manda o Angular redesenhar a tela
  private cdr = inject(ChangeDetectorRef);

  categorias = ['Todos', 'Blusa', 'Cropped', 'Calça', 'Shorts', 'Body', 'Vestido', 'Saia', 'Macacão', 'Conjunto'];
  categoriaSelecionada = 'Todos';
  termoBusca = '';

  ngOnInit() {
    // Fica escutando o "alarme". Quando tocar, atualiza a tela!
    this.state.produtosAtualizados.subscribe(() => {
      this.cdr.detectChanges();
    });
  }

  get produtosFiltrados() {
    let filtrados = this.state.produtos;

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

  filtrarPor(categoria: string) {
    this.categoriaSelecionada = categoria;
  }

  abrirPaginaProduto(produto: any) {
    (this.state as any).produtoAtual = { ...produto };

    if (produto.preco && produto.preco.includes('A partir de')) {
       (this.state as any).produtoAtual.precoExibicao = produto.preco;
    } else {
       (this.state as any).produtoAtual.precoExibicao = `R$ ${produto.precoNum.toFixed(2).replace('.', ',')}`;
    }

    this.router.navigate(['/produto']);
    window.scrollTo(0,0);
  }

  abrirAviso(tipo: string) {
    let msg = tipo === 'trocas'
      ? "Você tem até 7 dias após o recebimento para solicitar troca."
      : "Entregas em até 24h úteis para toda Mombaça.";

    alert(msg);
  }
}