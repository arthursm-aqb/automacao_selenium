/**
 * RETRO SPA JAVASCRIPT - SISTEMA DE CADASTRO DE USUÁRIOS
 * Compatível com arquitetura SPA sem recarregamento de página.
 */

(function () {
    'use strict';

    // Estado da Aplicação
    const state = {
        usuarios: [],
        usuarioEmEdicao: null,
        usuarioParaExcluir: null,
        somAtivado: true,
        buscaAtual: ''
    };

    // Sintetizador de Som Retrô (Web Audio API - 100% nativo, sem arquivos externos)
    const audioCtx = (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined')
        ? new (window.AudioContext || window.webkitAudioContext)()
        : null;

    function playRetroSound(tipo) {
        if (!state.somAtivado || !audioCtx) return;
        try {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            const now = audioCtx.currentTime;

            if (tipo === 'click') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
                osc.start(now);
                osc.stop(now + 0.04);
            } else if (tipo === 'success') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
                osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            } else if (tipo === 'delete') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(120, now + 0.15);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (tipo === 'alert') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(440, now);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
                osc.start(now);
                osc.stop(now + 0.18);
            }
        } catch (e) {
            console.warn("Áudio não disponível", e);
        }
    }

    // Obtenção do CSRF Token
    function getCsrfToken() {
        const input = document.querySelector('[name=csrfmiddlewaretoken]');
        if (input && input.value) return input.value;
        const cookie = document.cookie
            .split(';')
            .map(c => c.trim())
            .find(c => c.startsWith('csrftoken='));
        return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
    }

    // Elementos do DOM
    const elements = {
        formCadastro: document.getElementById('form-cadastro'),
        btnLimpar: document.getElementById('btn-limpar'),
        btnAmostras: document.getElementById('btn-amostras'),
        btnAtualizar: document.getElementById('btn-atualizar'),
        btnSomToggle: document.getElementById('btn-som-toggle'),
        tabelaCorpo: document.getElementById('tabela-usuarios-corpo'),
        loadingIndicator: document.getElementById('loading-indicator'),
        totalUsuariosBadge: document.getElementById('total-usuarios-badge'),
        inputBusca: document.getElementById('input-busca'),
        formBusca: document.getElementById('form-busca'),
        btnLimparBusca: document.getElementById('btn-limpar-busca'),
        statusBarTexto: document.getElementById('status-bar-texto'),
        relogioStatus: document.getElementById('relogio-status'),
        toast: document.getElementById('retro-toast'),
        toastMsg: document.getElementById('retro-toast-msg'),

        // Modal de Edição
        modalEdicao: document.getElementById('modal-edicao'),
        formEdicao: document.getElementById('form-edicao'),
        editId: document.getElementById('edit-id'),
        editNome: document.getElementById('edit-nome'),
        editCpf: document.getElementById('edit-cpf'),
        editTipo: document.getElementById('edit-tipo'),
        editSituacao: document.getElementById('edit-situacao'),
        btnFecharModalEdicao: document.getElementById('btn-fechar-modal-edicao'),
        btnCancelarEdicao: document.getElementById('btn-cancelar-edicao'),

        // Modal de Exclusão
        modalExclusao: document.getElementById('modal-exclusao'),
        exclusaoTexto: document.getElementById('exclusao-texto'),
        btnConfirmarExclusao: document.getElementById('btn-confirmar-exclusao'),
        btnCancelarExclusao: document.getElementById('btn-cancelar-exclusao'),
        btnFecharModalExclusao: document.getElementById('btn-fechar-modal-exclusao'),

        // Visitantes
        visitorCounter: document.getElementById('visitor-counter')
    };

    // Atualização de Status
    function setStatus(mensagem) {
        if (elements.statusBarTexto) {
            elements.statusBarTexto.textContent = mensagem;
        }
    }

    // Exibição de Toast / Balão Retrô
    function mostrarToast(mensagem, tipo = 'info') {
        if (!elements.toast || !elements.toastMsg) return;
        elements.toastMsg.textContent = mensagem;
        elements.toast.classList.add('show');
        if (tipo === 'success') playRetroSound('success');
        else if (tipo === 'error') playRetroSound('alert');
        else playRetroSound('click');

        setTimeout(() => {
            elements.toast.classList.remove('show');
        }, 3500);
    }

    // Máscara de CPF simples
    function formatarCpfInput(input) {
        input.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 11) v = v.slice(0, 11);
            if (v.length > 9) {
                v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
            } else if (v.length > 6) {
                v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
            } else if (v.length > 3) {
                v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
            }
            e.target.value = v;
        });
    }

    // Badge de Situação
    function renderSituacaoBadge(situacao) {
        const sitNormal = (situacao || '').toLowerCase().trim();
        let classe = 'tag-ativo';
        if (sitNormal.includes('ina') || sitNormal.includes('desat')) classe = 'tag-inativo';
        else if (sitNormal.includes('pend') || sitNormal.includes('aguard')) classe = 'tag-pendente';
        else if (sitNormal.includes('bloq') || sitNormal.includes('canc')) classe = 'tag-bloqueado';
        return `<span class="tag-badge ${classe}">${escapeHtml(situacao)}</span>`;
    }

    // Escape de HTML para segurança
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // 1. CARREGAR USUÁRIOS (READ)
    async function carregarUsuarios(termoBusca = '') {
        state.buscaAtual = termoBusca;
        elements.loadingIndicator.classList.add('active');
        setStatus('Consultando registros no servidor...');

        try {
            const url = termoBusca
                ? `/api/usuarios/?q=${encodeURIComponent(termoBusca)}`
                : '/api/usuarios/';
            const response = await fetch(url);
            if (!response.ok) throw new Error('Falha ao comunicar com o servidor.');

            const data = await response.json();
            state.usuarios = data.usuarios || [];

            renderTabela();
            if (elements.totalUsuariosBadge) {
                elements.totalUsuariosBadge.textContent = state.usuarios.length;
            }
            setStatus(`Pronto. ${state.usuarios.length} registros encontrados.`);
        } catch (err) {
            console.error(err);
            setStatus('Erro ao carregar dados do servidor.');
            mostrarToast('Erro ao carregar lista de usuários.', 'error');
        } finally {
            elements.loadingIndicator.classList.remove('active');
        }
    }

    // Renderizar Tabela
    function renderTabela() {
        const tbody = elements.tabelaCorpo;
        tbody.innerHTML = '';

        if (state.usuarios.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="6" style="text-align: center; padding: 25px; color: #666; font-style: italic;">
                    💾 Nenhum usuário cadastrado ou localizado nesta busca.<br>
                    <span style="font-size: 10px;">Clique em "Popular Amostra" para carregar usuários de exemplo.</span>
                </td>
            `;
            tbody.appendChild(tr);
            return;
        }

        state.usuarios.forEach(usuario => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: bold; width: 45px; text-align: center;">${usuario.id}</td>
                <td><strong>${escapeHtml(usuario.nome)}</strong></td>
                <td style="font-family: monospace;">${escapeHtml(usuario.cpf)}</td>
                <td><span class="tag-badge" style="background:#e8e8e8;">${escapeHtml(usuario.tipo)}</span></td>
                <td>${renderSituacaoBadge(usuario.situacao)}</td>
                <td style="text-align: center; width: 140px;">
                    <button class="retro-btn btn-action btn-edit" data-id="${usuario.id}" title="Editar registro">
                        ✏️ Editar
                    </button>
                    <button class="retro-btn btn-action btn-danger btn-delete" data-id="${usuario.id}" data-nome="${escapeHtml(usuario.nome)}" title="Excluir registro">
                        ❌ Excluir
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Eventos nos botões de ação da tabela
        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                playRetroSound('click');
                const id = btn.dataset.id;
                abrirModalEdicao(id);
            });
        });

        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                playRetroSound('click');
                const id = btn.dataset.id;
                const nome = btn.dataset.nome;
                abrirModalExclusao(id, nome);
            });
        });
    }

    // 2. CRIAR USUÁRIO (CREATE)
    async function criarUsuario(e) {
        e.preventDefault();
        playRetroSound('click');

        const nome = document.getElementById('cad-nome').value.trim();
        const cpf = document.getElementById('cad-cpf').value.trim();
        const tipo = document.getElementById('cad-tipo').value.trim();
        const situacao = document.getElementById('cad-situacao').value.trim();

        if (!nome || !cpf || !tipo || !situacao) {
            mostrarToast('Por favor, preencha todos os campos obrigatórios!', 'error');
            return;
        }

        setStatus('Gravando novo registro no banco de dados...');
        try {
            const response = await fetch('/api/usuarios/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ nome, cpf, tipo, situacao })
            });

            const data = await response.json();
            if (!response.ok) {
                const msg = data.error || 'Erro ao salvar usuário.';
                mostrarToast(msg, 'error');
                setStatus('Erro ao salvar registro.');
                return;
            }

            mostrarToast(`Usuário "${data.usuario.nome}" gravado com sucesso!`, 'success');
            elements.formCadastro.reset();
            document.getElementById('cad-nome').focus();
            carregarUsuarios(state.buscaAtual);
        } catch (err) {
            console.error(err);
            mostrarToast('Erro de conexão com o servidor.', 'error');
            setStatus('Falha de comunicação.');
        }
    }

    // 3. EDITAR USUÁRIO (UPDATE)
    async function abrirModalEdicao(id) {
        const usuario = state.usuarios.find(u => u.id == id);
        if (!usuario) {
            mostrarToast('Usuário não encontrado na lista atual.', 'error');
            return;
        }

        elements.editId.value = usuario.id;
        elements.editNome.value = usuario.nome;
        elements.editCpf.value = usuario.cpf;
        elements.editTipo.value = usuario.tipo;
        elements.editSituacao.value = usuario.situacao;

        elements.modalEdicao.classList.remove('hidden');
        elements.editNome.focus();
    }

    function fecharModalEdicao() {
        playRetroSound('click');
        elements.modalEdicao.classList.add('hidden');
    }

    async function salvarEdicao(e) {
        e.preventDefault();
        playRetroSound('click');

        const id = elements.editId.value;
        const nome = elements.editNome.value.trim();
        const cpf = elements.editCpf.value.trim();
        const tipo = elements.editTipo.value.trim();
        const situacao = elements.editSituacao.value.trim();

        if (!nome || !cpf || !tipo || !situacao) {
            mostrarToast('Todos os campos são obrigatórios.', 'error');
            return;
        }

        setStatus(`Atualizando registro ID ${id}...`);
        try {
            const response = await fetch(`/api/usuarios/${id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ nome, cpf, tipo, situacao })
            });

            const data = await response.json();
            if (!response.ok) {
                mostrarToast(data.error || 'Erro ao atualizar dados.', 'error');
                return;
            }

            mostrarToast('Registro atualizado com êxito!', 'success');
            fecharModalEdicao();
            carregarUsuarios(state.buscaAtual);
        } catch (err) {
            console.error(err);
            mostrarToast('Erro ao comunicar com o servidor.', 'error');
        }
    }

    // 4. EXCLUIR USUÁRIO (DELETE)
    function abrirModalExclusao(id, nome) {
        state.usuarioParaExcluir = { id, nome };
        elements.exclusaoTexto.textContent = `Tem certeza que deseja excluir o registro de "${nome}" (ID ${id})? Esta ação não pode ser desfeita.`;
        elements.modalExclusao.classList.remove('hidden');
    }

    function fecharModalExclusao() {
        playRetroSound('click');
        state.usuarioParaExcluir = null;
        elements.modalExclusao.classList.add('hidden');
    }

    async function executarExclusao() {
        if (!state.usuarioParaExcluir) return;
        playRetroSound('delete');
        const { id, nome } = state.usuarioParaExcluir;

        setStatus(`Excluindo registro ID ${id}...`);
        try {
            const response = await fetch(`/api/usuarios/${id}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });

            const data = await response.json();
            if (!response.ok) {
                mostrarToast(data.error || 'Erro ao remover usuário.', 'error');
                return;
            }

            mostrarToast(`Usuário "${nome}" foi removido!`, 'info');
            fecharModalExclusao();
            carregarUsuarios(state.buscaAtual);
        } catch (err) {
            console.error(err);
            mostrarToast('Erro ao excluir usuário.', 'error');
        }
    }

    // 5. POPULAR COM AMOSTRAS RETRÔ
    async function popularAmostras() {
        playRetroSound('click');
        setStatus('Inserindo registros clássicos de exemplo...');
        try {
            const response = await fetch('/api/usuarios/popular/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });
            const data = await response.json();
            mostrarToast(data.message, 'success');
            carregarUsuarios();
        } catch (err) {
            console.error(err);
            mostrarToast('Erro ao popular base de teste.', 'error');
        }
    }

    // Relógio da barra de status
    function iniciarRelogio() {
        function atualizar() {
            const agora = new Date();
            const h = String(agora.getHours()).padStart(2, '0');
            const m = String(agora.getMinutes()).padStart(2, '0');
            const s = String(agora.getSeconds()).padStart(2, '0');
            if (elements.relogioStatus) {
                elements.relogioStatus.textContent = `${h}:${m}:${s}`;
            }
        }
        atualizar();
        setInterval(atualizar, 1000);
    }

    // Contador de Visitas Retrô (Persistente em LocalStorage)
    function iniciarContadorVisitas() {
        if (!elements.visitorCounter) return;
        let count = parseInt(localStorage.getItem('retro_site_visits') || '4281', 10);
        count += 1;
        localStorage.setItem('retro_site_visits', count.toString());

        const str = String(count).padStart(6, '0');
        elements.visitorCounter.innerHTML = str
            .split('')
            .map(d => `<span class="hit-digit">${d}</span>`)
            .join('');
    }

    // Alternar Som
    function alternarSom() {
        state.somAtivado = !state.somAtivado;
        if (elements.btnSomToggle) {
            elements.btnSomToggle.textContent = state.somAtivado ? '🔊 Som: ON' : '🔈 Som: OFF';
        }
        if (state.somAtivado) playRetroSound('click');
    }

    // Inicialização de Eventos
    function inicializar() {
        // Formatações
        const cadCpf = document.getElementById('cad-cpf');
        const editCpf = document.getElementById('edit-cpf');
        if (cadCpf) formatarCpfInput(cadCpf);
        if (editCpf) formatarCpfInput(editCpf);

        // Formulário Cadastro
        if (elements.formCadastro) {
            elements.formCadastro.addEventListener('submit', criarUsuario);
        }
        if (elements.btnLimpar) {
            elements.btnLimpar.addEventListener('click', () => {
                playRetroSound('click');
                elements.formCadastro.reset();
                document.getElementById('cad-nome').focus();
            });
        }

        // Formulário Edição
        if (elements.formEdicao) {
            elements.formEdicao.addEventListener('submit', salvarEdicao);
        }
        if (elements.btnFecharModalEdicao) {
            elements.btnFecharModalEdicao.addEventListener('click', fecharModalEdicao);
        }
        if (elements.btnCancelarEdicao) {
            elements.btnCancelarEdicao.addEventListener('click', fecharModalEdicao);
        }

        // Modal Exclusão
        if (elements.btnConfirmarExclusao) {
            elements.btnConfirmarExclusao.addEventListener('click', executarExclusao);
        }
        if (elements.btnCancelarExclusao) {
            elements.btnCancelarExclusao.addEventListener('click', fecharModalExclusao);
        }
        if (elements.btnFecharModalExclusao) {
            elements.btnFecharModalExclusao.addEventListener('click', fecharModalExclusao);
        }

        // Busca
        if (elements.formBusca) {
            elements.formBusca.addEventListener('submit', (e) => {
                e.preventDefault();
                playRetroSound('click');
                carregarUsuarios(elements.inputBusca.value.trim());
            });
        }
        if (elements.inputBusca) {
            // Busca em tempo real leve (debounce)
            let debounceTimer;
            elements.inputBusca.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    carregarUsuarios(e.target.value.trim());
                }, 300);
            });
        }
        if (elements.btnLimparBusca) {
            elements.btnLimparBusca.addEventListener('click', () => {
                playRetroSound('click');
                elements.inputBusca.value = '';
                carregarUsuarios('');
            });
        }

        // Botões da Barra de Ferramentas
        if (elements.btnAtualizar) {
            elements.btnAtualizar.addEventListener('click', () => {
                playRetroSound('click');
                carregarUsuarios(state.buscaAtual);
            });
        }
        if (elements.btnAmostras) {
            elements.btnAmostras.addEventListener('click', popularAmostras);
        }
        if (elements.btnSomToggle) {
            elements.btnSomToggle.addEventListener('click', alternarSom);
        }

        // Fechar modais ao teclar ESC
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!elements.modalEdicao.classList.contains('hidden')) fecharModalEdicao();
                if (!elements.modalExclusao.classList.contains('hidden')) fecharModalExclusao();
            }
        });

        // Efeitos sonoros gerais para botões comuns
        document.querySelectorAll('.btn-tool, .menu-item').forEach(el => {
            el.addEventListener('click', () => playRetroSound('click'));
        });

        // Inicializar auxiliares e carregar dados
        iniciarRelogio();
        iniciarContadorVisitas();
        carregarUsuarios();
    }

    // Executa ao carregar o DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }
})();
