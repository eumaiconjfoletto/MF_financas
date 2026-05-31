async function login(email, senha) {

    try {

        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .eq('senha_hash', senha)
            .single();

        if (error || !data) {
            alert('Usuário ou senha inválidos');
            return;
        }

        const token = crypto.randomUUID();

        const agora = new Date();

        const expira = new Date();

        expira.setHours(expira.getHours() + 12);

        await supabaseClient
            .from('sessoes')
            .insert({
                usuario_id: data.id,
                token: token,
                expira_em: expira.toISOString()
            });

        localStorage.setItem(
            'mf_token',
            token
        );

        localStorage.setItem(
            'mf_usuario',
            JSON.stringify(data)
        );

        window.location.href =
            'dashboard.html';

    } catch (err) {

        console.error(err);

        alert(
            'Erro ao realizar login'
        );

    }

}
