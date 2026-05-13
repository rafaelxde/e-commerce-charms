import { Component, AfterViewChecked, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, Router } from '@angular/router';
import { StateService } from './core/state';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';

declare var lucide: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['../styles.css']
})
export class AppComponent implements AfterViewChecked, OnInit {
  
  // 1. AS FERRAMENTAS PRECISAM VIR PRIMEIRO PARA O ANGULAR RECONHECER
  public state = inject(StateService);
  public router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // 2. AGORA SIM O NGOINIT PODE USAR O "THIS.STATE"
  ngOnInit() {
    // Bloqueia o navegador de tentar dar scroll sozinho antes da hora
    if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    // 1. O VIGIA DO LOGIN
    this.state.loginCarregado.subscribe(() => {
      this.cdr.detectChanges(); 
    });

    // 2. O RESTAURADOR DE SCROLL 
    this.state.produtosAtualizados.subscribe(() => {
      if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        const scrollSalvo = sessionStorage.getItem('posicaoScroll');
        if (scrollSalvo) {
          // Diminuímos para 0 para ser o mais rápido possível após o carregamento
          setTimeout(() => {
            window.scrollTo({
              top: parseInt(scrollSalvo, 10),
              behavior: 'instant' 
            });
            sessionStorage.removeItem('posicaoScroll'); 
          }, 0); 
        }
      }
    });

    // 3. A MEMÓRIA DO F5 
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('posicaoScroll', window.scrollY.toString());
        }
      });
    }
  }

  // POPUP GLOBAL
  popupAtivo = false;
  popupMensagem = '';
  popupInputVisible = false;
  popupCancelVisible = false;
  popupInputValue: number = 1;
  acaoConfirmar: () => void = () => {};

  // ... (o resto do seu código continua igualzinho para baixo)

  ngAfterViewChecked() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // Verifica se estamos na rota principal para mostrar ou esconder links da Navbar
  get isLoja() {
    return this.router.url === '/';
  }

  // Função centralizada de navegação
  irPara(rota: string) {
    this.router.navigate([rota]);
    window.scrollTo(0,0);
  }

  // --- LÓGICA DO CARRINHO (Mantida na "casca" pois o carrinho é acessível de qualquer tela) ---
  removerItem(index: number) { 
    this.state.carrinho.splice(index, 1); 
  }

  editarQuantidade(index: number) {
    this.popupInputValue = this.state.carrinho[index].qtd;
    this.mostrarPopup("Digite a nova quantidade:", true, true, () => {
      const novaQtd = this.popupInputValue;
      if (novaQtd > 0) {
         const prodOriginal = this.state.produtos.find(p => p.id === this.state.carrinho[index].id);
         if (prodOriginal && novaQtd > prodOriginal.estoque) {
             this.mostrarPopup(`Temos apenas ${prodOriginal.estoque} unidades deste item.`, false, false, () => this.fecharPopup());
         } else {
             this.state.carrinho[index].qtd = novaQtd;
             this.fecharPopup();
         }
      } else {
         this.fecharPopup();
      }
    });
  }

  async finalizarCompra() {
    if(!this.state.usuarioLogado) {
        this.mostrarPopup("Faça login ou cadastre-se para finalizar a compra e informar o endereço de entrega.", false, false, () => {
            this.fecharPopup();
            this.state.carrinhoPanelAtivo = false;
            this.irPara('/login');
        });
        return;
    }

    if (this.state.carrinho.length === 0) return;

    const itensComprados = JSON.parse(JSON.stringify(this.state.carrinho));
    const totalComprado = this.state.valorTotalGeralFormatado;

    // Salva o pedido temporariamente no state
    (this.state as any).pedidoRecente = {
      clienteEmail: this.state.usuarioLogado.email,
      clienteTelefone: this.state.usuarioLogado.telefone,
      enderecoEntrega: `${this.state.usuarioLogado.bairro}, Nº ${this.state.usuarioLogado.numero} ${this.state.usuarioLogado.comp ? '- Comp: ' + this.state.usuarioLogado.comp : ''}`,
      itens: itensComprados,
      totalFormatado: totalComprado,
      data: new Date().toISOString(),
      status: 'Aguardando Pagamento'
    };

    // Abate de estoque
    for (let itemCarrinho of this.state.carrinho) {
        let produtoEncontrado = this.state.produtos.find(p => p.id === itemCarrinho.id);
        if (produtoEncontrado) {
            produtoEncontrado.estoque -= itemCarrinho.qtd;
            if(produtoEncontrado.estoque < 0) produtoEncontrado.estoque = 0;
            
            if(this.state.db) {
                try {
                  const prodRef = doc(this.state.db, 'produtos', produtoEncontrado.id.toString());
                  await updateDoc(prodRef, { estoque: produtoEncontrado.estoque });
                } catch(e) { console.error("Erro ao abater estoque:", e); }
            }
        }
    }

    // --- MUDANÇA IMPORTANTE AQUI ---
    // Primeiro salva no banco de dados para pegar o ID oficial gerado pelo Firebase
    if (this.state.db) {
      try {
        const pedidosRef = collection(this.state.db, 'pedidos');
        const docRef = await addDoc(pedidosRef, (this.state as any).pedidoRecente);
        
        // ANOTA O ID OFICIAL NA MEMÓRIA! É ele que a tela do comprovante vai usar.
        (this.state as any).pedidoRecente.id = docRef.id; 
      } catch (e) {
        console.error("Erro ao salvar pedido na nuvem: ", e);
      }
    }

    // Só depois limpa o carrinho e vai para a página do Comprovante
    this.state.esvaziarCarrinho();
    this.state.carrinhoPanelAtivo = false;
    this.irPara('/comprovante');
  }

  mostrarPopup(mensagem: string, mostrarInput: boolean, mostrarCancel: boolean, acao: () => void) {
    this.popupMensagem = mensagem;
    this.popupInputVisible = mostrarInput;
    this.popupCancelVisible = mostrarCancel;
    this.acaoConfirmar = acao;
    this.popupAtivo = true;
    this.cdr.detectChanges();
  }

  fecharPopup() { 
    this.popupAtivo = false; 
    this.cdr.detectChanges(); 
  }

  abrirAviso(tipo: string) {
    let msg = '';
    
    if (tipo === 'trocas') {
      msg = "Política da Charm's: Você tem até 7 dias após o recebimento para solicitar a troca de qualquer peça. Entre em contato com nosso WhatsApp informando o número do pedido!";
    } else {
      msg = "Envios Charm's: Entregamos em até 24h úteis para toda Mombaça! Para as demais regiões, o prazo e valor são calculados via Correios.";
    }
    
    this.mostrarPopup(msg, false, false, () => this.fecharPopup());
  }
}