import { Component, AfterViewChecked, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';

declare var lucide: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  template: `
    <nav class="navbar">
      <div class="container">
        <a class="logo-box" (click)="irPara('loja')" style="cursor: pointer;">
          <img src="/img/logo_charms.png" onerror="this.src='https://placehold.co/100x40/000000/ffffff?text=CHARMS'" alt="Logo" style="height: 40px;">
          <span class="brand-name">Charm's MV Confecções</span>
        </a>

        <ul class="nav-links">
          <li><a (click)="irPara('loja')" style="cursor: pointer;">loja</a></li>
          <li *ngIf="telaAtual === 'loja'"><a href="#sobre">sobre</a></li>
          <li *ngIf="telaAtual === 'loja'"><a href="#footer">ajuda</a></li>
        </ul>

        <div class="nav-right">
          <!-- SACOLA COM ÍCONE -->
          <div class="cart" (click)="carrinhoPanelAtivo = true">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            sacola ({{ totalItensCarrinho }})
          </div>

          <!-- BOTÃO DE LOGIN COM ÍCONE -->
          <div class="user-btn" (click)="irPara('login')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>{{ usuarioLogado ? 'Minha Conta' : 'Entrar' }}</span>
          </div>
        </div>
      </div>
    </nav>

    <!-- TELA DA LOJA -->
    <div *ngIf="telaAtual === 'loja'">
      <header class="hero">
        <div class="hero-bg" style="background-image: url('/img/banner_charms.png');"></div>
        <div class="hero-content">
          <p class="summer-tag">SUMMER EDITION 2026</p>
        </div>
      </header>

      <section class="curadoria" id="verao">
        <h2>NOSSA CURADORIA</h2>
        <div class="colecoes">
          <button class="colecao ativa">☀️ Coleção Verão</button>
        </div>

        <div class="produtos">
          <div class="card" *ngFor="let prod of produtos" (click)="abrirModalProduto(prod)">
            <img [src]="prod.img" onerror="this.src='https://placehold.co/400x500/eaeaea/999?text=Foto+do+Produto'" alt="Produto">
            <div class="card-info">
              <p class="produto-nome">{{ prod.nome }}</p>
              <p class="preco">{{ prod.preco }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="sobre" id="sobre">
        <div class="sobre-img">
          <img src="/img/fotodeexemplo.png" onerror="this.src='https://placehold.co/800x1000/eaeaea/999?text=Sobre+Nos'" alt="Sobre Nós">
        </div>
        <div>
          <h2>Charm's desde 2019</h2>
          <p>A Fábrica Charm's nasceu em 2019 em Mombaça com o propósito de criar peças femininas que unem elegância, conforto e durabilidade real.</p>
          <p>Cada peça recebe acabamento milimétrico, costuras reforçadas e modelagem precisa.</p>
          <p>Hoje entregamos para toda Mombaça, levando qualidade artesanal e estilo contemporâneo.</p>
        </div>
      </section>

      <footer class="footer" id="footer">
        <div class="footer-grid">
          <div>
            <h4>CHARM'S</h4>
            <a href="#sobre">Nossa história</a>
            <a href="#verao">Produtos</a>
            <a href="https://wa.me/5588996359190?" target="_blank">Contato</a>
          </div>

          <div>
            <h4>ATENDIMENTO</h4>
            <a href="#trocas" (click)="abrirAviso('trocas'); $event.preventDefault()">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
              Trocas e devoluções
            </a>
            <a href="#envios" (click)="abrirAviso('envios'); $event.preventDefault()">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><rect width="16" height="13" x="4" y="8" rx="2" ry="2"/><path d="M3 8v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8"/><path d="m3 8 2-3h14l2 3"/></svg>
              Envios
            </a>
            <a href="https://wa.me/5588998645155" target="_blank">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
              Suporte
            </a>
          </div>

          <div>
            <h4>REDES SOCIAIS</h4>
            <div class="social-icons">
              <a href="https://instagram.com/fabrica_charms" target="_blank" class="instagram-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a href="https://wa.me/5588996359190" target="_blank" class="whatsapp-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-whatsapp" viewBox="0 0 16 16">
                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          © 2026 Charm's MV Confecções — Todos os direitos reservados.
        </div>
      </footer>
    </div>

    <!-- TELA DE LOGIN / CADASTRO / PERFIL -->
    <div *ngIf="telaAtual === 'login'" class="auth-section">
      <div class="auth-box">
        
        <!-- Estado: Logado (Perfil do Cliente) -->
        <div *ngIf="usuarioLogado" class="logged-in-state">
          <div class="avatar-circle">
            {{ usuarioLogado.email.charAt(0).toUpperCase() }}
          </div>
          <h2>Olá, bem-vinda de volta!</h2>
          <p>{{ usuarioLogado.email }}</p>
          
          <div class="user-details" style="position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <p style="margin:0;"><strong>Meu Endereço de Entrega:</strong></p>
              <button *ngIf="!editandoEndereco" (click)="iniciarEdicaoEndereco()" style="background:none; border:none; color:#555; cursor:pointer; text-decoration:underline; font-size: 0.8rem;">Editar</button>
            </div>
            
            <!-- Visão Normal do Endereço -->
            <div *ngIf="!editandoEndereco">
              <p>{{ usuarioLogado.bairro }}, Nº {{ usuarioLogado.numero }}</p>
              <p *ngIf="usuarioLogado.comp">Complemento: {{ usuarioLogado.comp }}</p>
            </div>

            <!-- Modo de Edição de Endereço -->
            <div *ngIf="editandoEndereco" style="margin-top: 10px;">
              <input type="text" [(ngModel)]="editBairro" placeholder="Bairro" style="width: 100%; padding: 10px; margin-bottom: 8px; border: 1px solid #ccc; font-family: 'Montserrat', sans-serif;">
              <input type="text" [(ngModel)]="editNumero" placeholder="Número" style="width: 100%; padding: 10px; margin-bottom: 8px; border: 1px solid #ccc; font-family: 'Montserrat', sans-serif;">
              <input type="text" [(ngModel)]="editComp" placeholder="Complemento" style="width: 100%; padding: 10px; margin-bottom: 12px; border: 1px solid #ccc; font-family: 'Montserrat', sans-serif;">
              
              <div style="display: flex; gap: 10px;">
                <button class="btn-outline" style="padding: 10px;" (click)="editandoEndereco = false">Cancelar</button>
                <button class="btn-black" style="padding: 10px;" (click)="salvarEndereco()">Atualizar</button>
              </div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 25px;">
            <button class="btn-black" (click)="irPara('loja')">Voltar para a Loja</button>
            <button class="btn-outline" (click)="abrirHistorico()">Meus Pedidos</button>
            <button class="btn-outline" style="border-color: #eee; color: #666;" (click)="fazerLogout()">Sair da Conta</button>
          </div>
        </div>

        <!-- Estado: Não Logado -->
        <div *ngIf="!usuarioLogado">
          <h2>{{ modoAuth === 'login' ? 'Acesse sua conta' : 'Criar nova conta' }}</h2>
          <p class="auth-subtitle">
            {{ modoAuth === 'login' ? 'Insira seus dados para continuar.' : 'Preencha os dados abaixo para se cadastrar e salvar seu endereço.' }}
          </p>

          <form (ngSubmit)="executarAuth()" #authForm="ngForm">
            <!-- Email -->
            <div class="input-group">
              <label>E-mail</label>
              <input type="email" name="email" [(ngModel)]="authEmail" (blur)="validarEmail()" placeholder="exemplo@email.com" required>
              <span class="error-msg" *ngIf="erroEmail">Formato de e-mail inválido.</span>
            </div>

            <!-- Senha -->
            <div class="input-group">
              <label>Senha</label>
              <input type="password" name="senha" [(ngModel)]="authSenha" placeholder="Sua senha secreta" required>
            </div>

            <!-- Campos extras de Cadastro -->
            <div class="register-fields" *ngIf="modoAuth === 'cadastro'">
              <div class="input-row">
                <div class="input-group" style="flex: 2;">
                  <label>Bairro</label>
                  <input type="text" name="bairro" [(ngModel)]="authBairro" placeholder="Seu bairro">
                </div>
                <div class="input-group" style="flex: 1;">
                  <label>Número</label>
                  <input type="text" name="numero" [(ngModel)]="authNumero" placeholder="123">
                </div>
              </div>
              <div class="input-group">
                <label>Complemento <span style="color:#888; text-transform:none;">(Opcional)</span></label>
                <input type="text" name="comp" [(ngModel)]="authComp" placeholder="Apto, Bloco, etc.">
              </div>
            </div>

            <button type="submit" class="btn-black">
              {{ modoAuth === 'login' ? 'Entrar' : 'Cadastrar' }}
            </button>
          </form>

          <div class="auth-switch">
            <a (click)="alternarModoAuth()">
              {{ modoAuth === 'login' ? 'Não possui conta? Cadastre-se' : 'Já possui conta? Faça login' }}
            </a>
          </div>
        </div>

      </div>
    </div>

    <!-- TELA DO COMPROVANTE -->
    <div *ngIf="telaAtual === 'comprovante'" class="receipt-section">
      <div class="receipt-box">
        <div class="receipt-header">
          <img src="/img/logo_charms.png" onerror="this.src='https://placehold.co/100x40/000000/ffffff?text=CHARMS'" alt="Logo" style="height: 35px; margin-bottom: 15px;">
          <h2>COMPROVANTE DE PEDIDO</h2>
          <p>Data: {{ pedidoRecente?.data | date:'dd/MM/yyyy HH:mm' }}</p>
          <p style="font-size: 0.7rem; color: #1e8e3e; margin-top: 5px;">Pedido salvo no banco de dados da loja!</p>
        </div>
        
        <div class="receipt-body">
          <div class="receipt-items">
            <div class="r-item-header">
              <span>Roupas Escolhidas</span>
              <span>Subtotal</span>
            </div>
            <div class="r-item" *ngFor="let item of pedidoRecente?.itens">
              <div class="r-item-info">
                <strong>{{ item.qtd }}x {{ item.nome }}</strong>
                <span class="r-item-tam">Tamanho: {{ item.tamanho }}</span>
              </div>
              <span>{{ item.precoStr }}</span>
            </div>
          </div>

          <div class="receipt-total">
            <span>PREÇO TOTAL</span>
            <strong>{{ pedidoRecente?.totalFormatado }}</strong>
          </div>

          <div class="receipt-delivery">
            <h4>LOCAL PARA ENTREGA</h4>
            <p>Aos cuidados de: <strong>{{ usuarioLogado?.email }}</strong></p>
            <p>{{ usuarioLogado?.bairro }}, Nº {{ usuarioLogado?.numero }}</p>
            <p *ngIf="usuarioLogado?.comp">Complemento: {{ usuarioLogado?.comp }}</p>
            <div class="status-badge">Aguardando Pagamento</div>
          </div>
        </div>

        <button class="btn-black" style="margin-top: 30px;" (click)="irPara('loja')">Voltar para a Loja</button>
      </div>
    </div>

    <!-- TELA DE HISTÓRICO DE COMPRAS -->
    <div *ngIf="telaAtual === 'historico'" class="receipt-section">
      <div class="receipt-box" style="max-width: 600px;">
        <div class="receipt-header" style="border-bottom: none; margin-bottom: 0;">
          <h2 style="font-size: 1.5rem;">MEUS PEDIDOS</h2>
          <p>Acompanhe suas compras, {{ usuarioLogado?.email }}</p>
        </div>
        
        <div class="receipt-body" style="margin-top: 20px;">
          <div *ngIf="carregandoHistorico" style="text-align: center; padding: 20px; color: #666;">
            Buscando seus pedidos...
          </div>
          
          <div *ngIf="!carregandoHistorico && historicoPedidos.length === 0" style="text-align: center; padding: 30px; background: #fafafa; border-radius: 8px;">
            <p style="color: #666; margin-bottom: 15px;">Você ainda não realizou nenhuma compra.</p>
            <button class="btn-black" style="width: auto; padding: 10px 20px;" (click)="irPara('loja')">Começar a comprar</button>
          </div>
          
          <div *ngFor="let pedido of historicoPedidos" class="pedido-card">
            <div class="pedido-card-header">
              <strong>Em: {{ pedido.data | date:'dd/MM/yyyy HH:mm' }}</strong>
              <span class="status-badge" style="margin: 0;">{{ pedido.status || 'Processando' }}</span>
            </div>
            
            <div *ngFor="let item of pedido.itens" class="pedido-item-row">
              <span>{{ item.qtd }}x {{ item.nome }} <small style="color:#888;">(Tam: {{ item.tamanho }})</small></span>
              <span>{{ item.precoStr }}</span>
            </div>
            
            <div class="pedido-card-footer">
              <span style="font-size: 0.8rem; color: #666; max-width: 60%;">Entregar em: {{ pedido.enderecoEntrega }}</span>
              <strong>Total: {{ pedido.totalFormatado }}</strong>
            </div>
          </div>
        </div>

        <button class="btn-outline" style="margin-top: 20px;" (click)="irPara('login')">Voltar para meu perfil</button>
      </div>
    </div>


    <!-- MODAL DE PRODUTO -->
    <div class="modal" [class.active]="modalAtivo" (click)="fecharModalProduto()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <img [src]="produtoAtual?.img" onerror="this.src='https://placehold.co/400x500/eaeaea/999?text=Foto+do+Produto'" alt="" style="width: 100%; height: 100%; object-fit: cover;">
        <div class="modal-info">
          <h3>{{ produtoAtual?.nome }}</h3>
          <p>{{ produtoAtual?.preco }}</p>

          <label style="font-size: 0.7rem; letter-spacing: 1px; margin-bottom: 10px; display: block;">TAMANHO</label>
          <div class="tamanhos">
            <div class="tamanho" 
                 *ngFor="let tam of tamanhos" 
                 [class.ativo]="tamanhoSelecionado === tam"
                 (click)="selecionarTamanho(tam)">
              {{ tam }}
            </div>
          </div>

          <label style="font-size: 0.7rem; letter-spacing: 1px; margin-bottom: 10px; display: block;">QUANTIDADE</label>
          <div class="selector-qtd">
            <div class="qtd-box">
              <button class="qtd-btn" (click)="alterarQuantidade(-1)">-</button>
              <span>{{ quantidade }}</span>
              <button class="qtd-btn" (click)="alterarQuantidade(1)">+</button>
            </div>
          </div>

          <button class="btn-black" style="border-radius:30px; padding:18px;" (click)="adicionarAoCarrinho()">Incluir na sacola</button>
        </div>
      </div>
    </div>

    <!-- SACOLA -->
    <div class="cart-panel" [class.active]="carrinhoPanelAtivo">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h3>Sacola</h3>
        <button (click)="carrinhoPanelAtivo = false" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
      </div>
      
      <div id="cartItems">
        <p *ngIf="carrinho.length === 0" style="margin-top:20px; color:#666;">Sua sacola está vazia.</p>
        <div class="cart-item" *ngFor="let item of carrinho; let i = index">
          <strong>{{ item.nome }}</strong><br>
          Tamanho: {{ item.tamanho }}<br>
          Quantidade: {{ item.qtd }}x — {{ item.precoStr }}<br> 
          
          <div style="margin-top:10px; display:flex; gap:15px; align-items:center;">
            <span (click)="editarQuantidade(i)" style="cursor:pointer; color:#555; display: flex; align-items: center; gap: 4px; font-size: 0.8rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              Editar
            </span>
            <span (click)="removerItem(i)" style="cursor:pointer; color:#d93025; display: flex; align-items: center; gap: 4px; font-size: 0.8rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              Remover
            </span>
          </div>
        </div>
      </div>
      
      <div id="cartTotal" *ngIf="carrinho.length > 0">
        <strong>Total:</strong> {{ valorTotalGeralFormatado }}
      </div>
      <button *ngIf="carrinho.length > 0" (click)="esvaziarCarrinho()" class="btn-outline" style="margin-top:15px;">
        Esvaziar sacola
      </button>
      <button *ngIf="carrinho.length > 0" class="btn-black" style="margin-top:10px;" (click)="finalizarCompra()">
        Finalizar compra
      </button>
    </div>

    <!-- POPUP CUSTOMIZADO -->
    <div class="custom-popup" [class.active]="popupAtivo">
      <div class="popup-box">
        <p>{{ popupMensagem }}</p>
        <input type="number" *ngIf="popupInputVisible" [(ngModel)]="popupInputValue" min="1" style="width:100%; padding:8px; margin-bottom:20px; border:1px solid #ddd; border-radius:6px;">
        <div class="popup-buttons">
          <button *ngIf="popupCancelVisible" class="btn-outline" (click)="fecharPopup()">Cancelar</button>
          <button class="btn-black" (click)="acaoConfirmar()">Confirmar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :root{ --black:#000; --white:#fff; --gray-border:#eee; --gray-bg:#fcfcfc; }
    *{margin:0;padding:0;box-sizing:border-box;scroll-behavior:smooth;}
    body{font-family:'Montserrat',sans-serif; background: #fff;}

    /* BOTOES GERAIS */
    .btn-black { width: 100%; background: #000; color: #fff; border: 1px solid #000; padding: 14px; cursor: pointer; font-family: 'Montserrat', sans-serif; font-weight: 600; letter-spacing: 1px; transition: .3s; }
    .btn-black:hover { background: #333; }
    .btn-outline { width: 100%; background: transparent; color: #000; border: 1px solid #000; padding: 14px; cursor: pointer; font-family: 'Montserrat', sans-serif; font-weight: 600; letter-spacing: 1px; transition: .3s; }
    .btn-outline:hover { background: #f9f9f9; }

    /* NAVBAR */
    .navbar{ position:fixed; top:0; width:100%; background:rgba(255,255,255,.95); backdrop-filter:blur(10px); border-bottom:1px solid var(--gray-border); z-index:1000; }
    .container{ max-width:1400px; margin:auto; padding:15px 40px; display:grid; grid-template-columns:auto 1fr auto; align-items:center; position:relative; }
    .logo-box{display:flex;align-items:center;gap:15px;text-decoration:none;color:#000;}
    .brand-name{font-family:'Cormorant Garamond',serif; font-size:1.3rem;}
    .nav-links{ position:absolute; left:50%; transform:translateX(-50%); display:flex; gap:35px; list-style:none; }
    .nav-links a{ text-decoration:none; color:#000; font-size:.75rem; letter-spacing:2px; text-transform:uppercase; }
    .nav-right{display:flex;align-items:center;gap:20px;justify-self:end;}
    .cart, .user-btn{font-size:.65rem;letter-spacing:1px;text-transform:uppercase; cursor:pointer; display:flex; align-items:center; gap: 6px;}

    /* HERO */
    .hero{ height:70vh; margin-top:70px; display:flex; justify-content:center; align-items:center; position:relative; background: #fafafa; overflow:hidden;}
    .hero-bg{ position:absolute; inset:0; background-position:center; background-size:cover; z-index:0; }
    .hero-content{position:absolute;bottom:80px;text-align:center; z-index:1;}
    .summer-tag{ border:1px solid #000; padding:8px 18px; letter-spacing:8px; font-size:.85rem; background:rgba(255,255,255,.9); }

    /* CURADORIA */
    .curadoria{padding:80px 40px;background:var(--gray-bg);}
    .curadoria h2{ font-family:'Cormorant Garamond',serif; font-size:3rem; text-align:center; margin-bottom:40px; }
    .produtos{ display:grid; grid-template-columns:repeat(4,1fr); gap:30px; }
    .card{background:#fff;transition:.3s;cursor:pointer;}
    .card:hover{transform:translateY(-6px);}
    .card img{ width: 100%; height: 420px; object-fit: cover; display:block;}
    .card-info{padding:12px 5px;}
    .produto-nome{font-size:.8rem;letter-spacing:1px;margin-bottom:6px;}
    .preco{font-size:.8rem;font-weight:600;}

    /* SOBRE */
    .sobre{ padding:90px 40px; max-width:1200px; margin:auto; display:grid; grid-template-columns:1fr 1fr; gap:60px; align-items:center; }
    .sobre-img{ border-radius:18px; overflow:hidden; border:6px solid #fff; box-shadow:0 15px 40px rgba(0,0,0,.15); transition:.4s ease; }
    .sobre-img img{ width: 100%; height: 520px; object-fit: cover; display: block;}
    .sobre-img:hover{transform:translateY(-6px);}
    .sobre h2{ font-family:'Cormorant Garamond',serif; font-size:3rem; margin-bottom:20px; }
    .sobre p{font-size:.95rem;line-height:1.8;margin-bottom:14px;}

    /* TELA DE LOGIN / CADASTRO */
    .auth-section { margin-top: 70px; min-height: 80vh; display: flex; align-items: center; justify-content: center; background: #fafafa; padding: 40px 20px; }
    .auth-box { background: #fff; width: 100%; max-width: 450px; padding: 50px 40px; border: 1px solid #eaeaea; box-shadow: 0 10px 30px rgba(0,0,0,0.03); }
    .auth-box h2 { font-family: 'Cormorant Garamond', serif; font-size: 2.2rem; margin-bottom: 5px; text-align: center; }
    .auth-subtitle { text-align: center; font-size: 0.85rem; color: #666; margin-bottom: 30px; }
    .input-group { margin-bottom: 20px; text-align: left; }
    .input-row { display: flex; gap: 15px; }
    .input-group label { display: block; font-size: 0.7rem; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; color: #333; font-weight: 600; }
    .input-group input { width: 100%; padding: 14px; border: 1px solid #ddd; outline: none; transition: .3s; font-family: 'Montserrat', sans-serif; font-size: 0.9rem; }
    .input-group input:focus { border-color: #000; }
    .error-msg { color: #d93025; font-size: 0.75rem; margin-top: 5px; display: block; }
    .auth-switch { text-align: center; margin-top: 25px; }
    .auth-switch a { font-size: 0.8rem; color: #000; text-decoration: underline; cursor: pointer; }
    .logged-in-state { text-align: center; }
    .avatar-circle { width: 70px; height: 70px; background: #000; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 20px; }
    .user-details { text-align: left; background: #f9f9f9; padding: 20px; border: 1px solid #eee; font-size: 0.9rem; line-height: 1.6; }

    /* TELA DO COMPROVANTE & HISTORICO */
    .receipt-section { margin-top: 70px; min-height: 80vh; display: flex; align-items: center; justify-content: center; background: #f4f4f4; padding: 40px 20px; }
    .receipt-box { background: #fff; width: 100%; max-width: 500px; padding: 40px; border-top: 8px solid #000; box-shadow: 0 15px 35px rgba(0,0,0,0.08); position: relative;}
    .receipt-header { text-align: center; border-bottom: 2px dashed #eee; padding-bottom: 20px; margin-bottom: 20px; }
    .receipt-header h2 { font-family: 'Montserrat', sans-serif; font-size: 1.2rem; letter-spacing: 2px; }
    .receipt-header p { font-size: 0.8rem; color: #888; margin-top: 5px; }
    .r-item-header { display: flex; justify-content: space-between; font-size: 0.75rem; color: #888; text-transform: uppercase; margin-bottom: 15px; font-weight: 600; }
    .r-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-size: 0.9rem; }
    .r-item-info { display: flex; flex-direction: column; gap: 4px; }
    .r-item-tam { font-size: 0.75rem; color: #666; }
    .receipt-total { border-top: 2px dashed #eee; padding-top: 20px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 1.2rem; }
    .receipt-delivery { background: #fafafa; border: 1px solid #eee; padding: 20px; margin-top: 25px; border-radius: 6px; }
    .receipt-delivery h4 { font-size: 0.8rem; letter-spacing: 1px; margin-bottom: 10px; color: #333; }
    .receipt-delivery p { font-size: 0.85rem; color: #555; margin-bottom: 5px; line-height: 1.4; }
    .status-badge { display: inline-block; background: #fff3cd; color: #856404; padding: 5px 12px; font-size: 0.7rem; font-weight: bold; border-radius: 20px; margin-top: 10px; text-transform: uppercase; }

    /* ESTILOS DO HISTÓRICO DE PEDIDOS */
    .pedido-card { border: 1px solid #eaeaea; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .pedido-card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px; margin-bottom: 15px; font-size: 0.9rem; }
    .pedido-item-row { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 8px; color: #333; }
    .pedido-card-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 15px; padding-top: 15px; border-top: 1px dashed #f0f0f0; }

    /* FOOTER */
    .footer{background:#000;color:#fff;padding:60px 40px 25px;}
    .footer-grid{ max-width:1000px; margin:auto; display:grid; grid-template-columns:repeat(3,1fr); gap:40px; text-align:center; align-items:start; }
    .footer h4{font-size:.8rem;letter-spacing:2px;margin-bottom:18px;}
    .footer a{ color:#fff; text-decoration:none; font-size:.8rem; display:flex; align-items:center; justify-content:center; margin-bottom:8px; }
    .footer-bottom{ text-align:center; margin-top:50px; font-size:.85rem; opacity:.85; border-top:1px solid rgba(255,255,255,.15); padding-top:20px; }

    /* SOCIAL PREMIUM */
    .social-icons{ display:flex; justify-content:center; gap:22px; margin-top:10px; }
    .social-icons a{ width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#0f0f0f; box-shadow:0 8px 20px rgba(0,0,0,.35); transition:.35s ease; color:#fff; }
    .social-icons a:hover{ transform:translateY(-3px) scale(1.08); }
    .social-icons svg{ width:24px; height:24px; }
    .instagram-icon svg{ stroke:#E1306C; }
    .whatsapp-icon{ color:#25D366; }
    .whatsapp-icon svg{ width:26px; height:26px; fill:#25D366; }

    /* SELETOR */
    .colecoes{ display:flex; justify-content:center; gap:18px; margin:40px 0 30px; }
    .colecao{ background:transparent; border:1px solid #000; padding:10px 22px; font-family:'Montserrat',sans-serif; font-size:.8rem; letter-spacing:2px; text-transform:uppercase; cursor:pointer; transition:.3s ease; }
    .colecao:hover, .colecao.ativa{ background:#000; color:#fff; }

    /* MODAL */
    .modal{ position:fixed; inset:0; background:rgba(0,0,0,.6); display:none; align-items:center; justify-content:center; z-index:2000; }
    .modal.active{display:flex;}
    .modal-box{ background:#fff; width:850px; max-width:95%; border-radius:12px; display:grid; grid-template-columns:1fr 1.2fr; overflow:hidden; }
    .modal-info{padding:35px; display: flex; flex-direction: column; justify-content: center;}
    .modal-info h3{ font-family: 'Cormorant Garamond', serif; font-size: 2rem; margin-bottom: 5px; }
    .modal-info p{ font-weight: 600; font-size: 1.2rem; margin-bottom: 25px; }
    .tamanhos{ display:flex; gap:12px; margin-bottom: 25px; }
    .tamanho{ width:44px; height:44px; border-radius:50%; border:1px solid #aaa; display:flex; align-items:center; justify-content:center; cursor:pointer; transition: .2s; font-size: 0.8rem; }
    .tamanho.ativo{ background:#000; color:#fff; border-color:#000; }
    .selector-qtd{ display: flex; align-items: center; gap: 15px; margin-bottom: 25px; }
    .qtd-box{ display:flex; align-items:center; gap:15px; border: 1px solid #ddd; padding: 5px 15px; border-radius: 30px; }
    .qtd-btn{ background:none; border:none; font-size:20px; cursor:pointer; padding: 0 10px; }

    /* SACOLA */
    .cart-panel{ position:fixed; right:-400px; top:0; width:360px; height:100%; background:#fff; box-shadow:-10px 0 30px rgba(0,0,0,.2); transition:.4s; z-index:3000; padding:25px; display: flex; flex-direction: column; }
    .cart-panel.active{right:0 !important;}
    #cartItems{ margin-top: 20px; flex-grow: 1; overflow-y: auto; }
    .cart-item{ border-bottom:1px solid #eee; padding:15px 0; font-size:.9rem; line-height: 1.5; }
    #cartTotal { font-size: 1.1rem; text-align: right; margin-top: 20px; padding-top: 15px; border-top: 2px solid #eee; }

    /* POPUP */
    .custom-popup{ position:fixed; inset:0; background:rgba(0,0,0,.5); display:none; align-items:center; justify-content:center; z-index:5000; }
    .custom-popup.active{ display:flex; }
    .popup-box{ background:#fff; padding:30px; width:320px; border-radius:12px; text-align:center; }
    .popup-box p{ margin-bottom:20px; }
    .popup-buttons{ display:flex; justify-content:space-between; gap:10px; }
    .popup-buttons button{ flex:1; }

    @media (max-width: 1024px) {
        .produtos { grid-template-columns: repeat(2, 1fr); }
        .sobre { grid-template-columns: 1fr; text-align: center; gap: 40px; }
    }
    @media (max-width: 768px) {
        .container { grid-template-columns: 1fr auto; padding: 15px 20px; gap: 15px; }
        .nav-links { display: none; }
        .produtos { grid-template-columns: 1fr; }
        .modal-box { grid-template-columns: 1fr; max-height: 90vh; overflow-y: auto; }
        .cart-panel { width: 100%; right: -100%; }
        .auth-box, .receipt-box { padding: 30px 20px; border: none; box-shadow: none; }
    }
  `]
})
export class AppComponent implements OnInit, AfterViewChecked {
  private cdr = inject(ChangeDetectorRef);

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

  // IMAGENS E COLEÇÃO FICTÍCIA AMPLIADA
  produtos = [
    { nome: "Vestido Tropical Breeze", preco: "R$ 189,90", precoNum: 189.90, img: "/img/vestido_tropical.jpg" },
    { nome: "Conjunto Linho Off-White", preco: "R$ 229,90", precoNum: 229.90, img: "/img/conjunto_linho.jpg" },
    { nome: "Saia Midi Estampa Floral", preco: "R$ 159,90", precoNum: 159.90, img: "/img/saia_midi.jpg" },
    { nome: "Blusa Cropped Amarração", preco: "R$ 119,90", precoNum: 119.90, img: "/img/cropped_amarracao.jpg" },
    { nome: "Calça Pantalona Areia", preco: "R$ 249,90", precoNum: 249.90, img: "/img/calca_pantalona.jpg" },
    { nome: "Vestido Longo Pôr do Sol", preco: "R$ 279,90", precoNum: 279.90, img: "/img/vestido_longo.jpg" },
    { nome: "Macacão Viscose Leve", preco: "R$ 219,90", precoNum: 219.90, img: "/img/macacao.jpg" },
    { nome: "Shorts Alfaiataria Cinto", preco: "R$ 139,90", precoNum: 139.90, img: "/img/shorts_alfaiataria.jpg" }
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