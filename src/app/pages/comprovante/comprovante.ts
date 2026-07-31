import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StateService } from '../../core/state';
import { doc, updateDoc } from 'firebase/firestore'; // IMPORTANDO AS FUNÇÕES DO BANCO

@Component({
  selector: 'app-comprovante',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comprovante.html'
})
export class ComprovanteComponent {
  public state = inject(StateService);
  private router = inject(Router);
  
  // INJETANDO O ATUALIZADOR DE TELA
  private cdr = inject(ChangeDetectorRef);

  metodoPagamentoSelecionado: 'pix' | 'cartao' = 'pix';
  processando = false; // Controla o visual do botão

  get pedidoRecente() {
    return (this.state as any).pedidoRecente;
  }

  async simularPagamento() {
    this.processando = true; // Muda o botão para "Processando..."

    try {
      // Verifica se temos o ID do pedido e a conexão com o banco
      if (this.pedidoRecente && this.pedidoRecente.id && this.state.db) {
    
        // 1. Atualiza o status oficialmente lá no Firebase
        const pedidoRef = doc(this.state.db, 'pedidos', this.pedidoRecente.id);
        await updateDoc(pedidoRef, {
          status: 'Pagamento Aprovado'
        });

      }

      // 2. O setTimeout segura a tela por 1.5 segundos para o efeito visual de "ir ao banco"
      setTimeout(() => {
        if (this.pedidoRecente) {
          this.pedidoRecente.status = 'Pagamento Aprovado'; // Atualiza na tela
        }
        this.processando = false; // Destrava o botão
        this.cdr.detectChanges(); // Força a tela a exibir o comprovante verde!
      }, 1500);

    } catch (error: any) {
      console.error("ERRO REAL DO FIREBASE:", error);

      if (error.code === 'permission-denied') {
        alert("O Firebase bloqueou! Verifique a aba 'Regras' no painel do Firestore.");
      } else {
        alert("Erro ao processar: " + error.message);
      }

      this.processando = false;
      this.cdr.detectChanges();
    }
  }

  irPara(rota: string) {
    this.router.navigate([rota]);
  }
}