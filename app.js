/**
 * SISTEMA INTEGRADO - Scripts Globais e Utilitários
 */

// Injeta automaticamente o HTML do Loader assim que o corpo da página estiver pronto
document.addEventListener("DOMContentLoaded", () => {
    const loaderHTML = `
        <div id="global-loader" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] transition-all duration-300 hidden">
            <div class="bg-[#16161a] border border-zinc-800 rounded-2xl p-6 flex flex-col items-center space-y-4 shadow-2xl max-w-xs w-full">
                <!-- Spinner Animado Dourado -->
                <div class="w-10 h-10 border-4 border-zinc-800 border-t-[#d4af37] rounded-full animate-spin"></div>
                <!-- Texto de Status -->
                <div class="text-center">
                    <p class="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">Sincronizando</p>
                    <span class="text-[10px] text-zinc-600 font-medium">Aguardando resposta do banco...</span>
                </div>
            </div>
        </div>
    `;
    // Adiciona o elemento no final do body
    document.body.insertAdjacentHTML('beforeend', loaderHTML);
});

// Funções Globais de Controle de Carregamento (Disponíveis em qualquer script)
window.showLoader = function() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.remove('hidden');
};

window.hideLoader = function() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');
};

// Utilitário Global: Formatação de Moeda Brasileira (R$)
window.formatBRL = function(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0);
};
