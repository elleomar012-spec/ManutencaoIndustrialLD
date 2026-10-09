# Manutenção Industrial LD

Aplicativo móvel para registrar equipamentos, planos preventivos e ordens de serviço, com dados locais e uso offline.

## Recursos da primeira versão
- Painel com contagem de equipamentos, operacionais, OS abertas e OS atrasadas.
- Cadastro de equipamentos (inclui 5 masseiras de exemplo; é possível cadastrar mais).
- Situação do ativo: operacional, em manutenção ou parada.
- Ordens preventivas e corretivas, responsável, prioridade, prazo, checklist, peças trocadas e relato de conclusão.
- Histórico de OS por equipamento.
- Planos preventivos com frequência e checklist editáveis.
- Impressão/geração de relatório de OS e relatório geral.
- Exportação e importação de backup JSON.
- Interface responsiva com tema escuro, adequada para celular.

## Gerar APK pelo GitHub Actions
1. Crie um repositório separado chamado `ManutencaoIndustrialLD` no GitHub.
2. Envie todos os arquivos e pastas deste pacote para a raiz do repositório. Confirme que a pasta `.github/workflows` foi incluída.
3. Abra a aba **Actions** do repositório e habilite os workflows, se o GitHub pedir.
4. Abra **Build Manutenção Industrial LD APK** e toque em **Run workflow** (ou faça um commit na branch `main`/`master` para disparar automaticamente).
5. Quando o workflow terminar com sucesso, abra a execução e baixe o artefato `manutencao-industrial-ld-apk`. Dentro do ZIP estará `app-debug.apk`.
6. No Android, abra o APK baixado e autorize a instalação quando solicitado. APK de teste não é publicado na Play Store.

## Dados e privacidade
Os dados são armazenados localmente no aplicativo. Não há sincronização automática entre aparelhos. Use **Exportar backup** com frequência e guarde o arquivo em local seguro. Limpar os dados ou desinstalar o app pode apagar os registros locais.

## Observações técnicas
Este é um APK de teste (debug), gerado pelo GitHub Actions. Antes de uso crítico em produção, valide os fluxos no aparelho e mantenha backups. Fotos de antes/depois, sincronização em nuvem e notificações automáticas não estão incluídas nesta versão inicial.
