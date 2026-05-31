// =====================================
// LOGIN
// =====================================

async function login(email, senha) {

    try {

        const { data: usuario, error } =
            await supabaseClient
                .from('usuarios')
                .select('*')
                .eq('email', email.trim())
                .eq('senha_hash', senha)
                .eq('ativo', true)
                .single();

        if (error || !usuario) {

            alert('Usuário ou senha inválidos');
            return;

        }

        const token =
            crypto.randomUUID();

        const agora =
            new Date();

        const expira =
            new Date();

        expira.setHours(
            expira.getHours() + 12
        );

        const { error: erroSessao } =
            await supabaseClient
                .from('sessoes')
                .insert({
                    usuario_id: usuario.id,
                    token: token,
                    criado_em: agora.toISOString(),
                    expira_em: expira.toISOString()
                });

        if (erroSessao) {

            console.error(erroSessao);

            alert(
                'Erro ao criar sessão'
            );

            return;

        }

        await supabaseClient
            .from('usuarios')
            .update({
                ultimo_login:
                    agora.toISOString()
            })
            .eq('id', usuario.id);

        localStorage.setItem(
            'mf_token',
            token
        );

        localStorage.setItem(
            'mf_usuario',
            JSON.stringify(usuario)
        );

        window.location.href =
            'dashboard.html';

    }
    catch (err) {

        console.error(err);

        alert(
            'Erro ao realizar login'
        );

    }

}


// =====================================
// VALIDAR SESSÃO
// =====================================

async function verificarSessao() {

    const token =
        localStorage.getItem(
            'mf_token'
        );

    if (!token) {

        window.location.href =
            'index.html';

        return null;

    }

    const { data, error } =
        await supabaseClient
            .from('sessoes')
            .select('*')
            .eq('token', token)
            .single();

    if (
        error ||
        !data
    ) {

        logout();
        return null;

    }

    const agora =
        new Date();

    const expira =
        new Date(
            data.expira_em
        );

    if (agora > expira) {

        logout();
        return null;

    }

    return data;

}


// =====================================
// LOGOUT
// =====================================

async function logout() {

    const token =
        localStorage.getItem(
            'mf_token'
        );

    if (token) {

        await supabaseClient
            .from('sessoes')
            .delete()
            .eq('token', token);

    }

    localStorage.removeItem(
        'mf_token'
    );

    localStorage.removeItem(
        'mf_usuario'
    );

    window.location.href =
        'index.html';

}


// =====================================
// USUÁRIO LOGADO
// =====================================

function getUsuarioLogado() {

    const usuario =
        localStorage.getItem(
            'mf_usuario'
        );

    if (!usuario)
        return null;

    return JSON.parse(
        usuario
    );

}
