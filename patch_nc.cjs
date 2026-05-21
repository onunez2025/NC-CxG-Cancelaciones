const fs = require('fs');

let content = fs.readFileSync('server/routes/nc.ts', 'utf8');

// 1. Cancelaciones Create
content = content.replace(
    /INSERT INTO \[dbo\]\.\[GAC_APP_TB_CANCELACIONES\] \s*\n\s*\(ID_Cancelados, Ticket, Motivo_Cancelacion, Autorizador_Cancelacion, Generado_el, Estado_Proceso\)\s*\n\s*VALUES \(\@id, \@ticket, \@motivo, \@autorizador, GETDATE\(\), 'REGISTRADO'\)/,
    `INSERT INTO [dbo].[GAC_APP_TB_CANCELACIONES] 
                (ID_Cancelados, Ticket, Motivo_Cancelacion, Autorizador_Cancelacion, Generado_el, Estado_Proceso, Creado_por)
                VALUES (@id, @ticket, @motivo, @autorizador, GETDATE(), 'REGISTRADO', @autorizador)`
);

// We also need to add history for create:
content = content.replace(
    /res\.status\(201\)\.json\(\{ message: 'Cancelación registrada', id \}\);/,
    `await pool.request()
                .input('histId', sql.VarChar, Math.random().toString(16).substring(2, 10).toUpperCase())
                .input('id', sql.VarChar, id)
                .input('accion', sql.VarChar, 'Creación')
                .input('obs', sql.VarChar, observacion || 'Solicitud registrada')
                .input('usuario', sql.VarChar, usuario || 'Sistema')
                .query(\`
                    INSERT INTO [dbo].[GAC_APP_TB_HISTORIAL_CANCELACIONES]
                    (ID_Historial_Cancelacion, ID_Cancelados, Accion, Observacion, Creado_el, Creado_por)
                    VALUES (@histId, @id, @accion, @obs, GETDATE(), @usuario)
                \`);
        res.status(201).json({ message: 'Cancelación registrada', id });`
);


// 2. Cancelaciones Gestionar
content = content.replace(
    /UPDATE \[dbo\]\.\[GAC_APP_TB_CANCELACIONES\] \s*\n\s*SET \s*\n\s*Cancelacion_Correcta = \@cancelacion_correcta,\s*\n\s*Motivo_Correcto = \@motivo_correcto,\s*\n\s*Observacion_Gestionado = \@observacion,\s*\n\s*Gestionado_por = \@gestionado_por,\s*\n\s*Gestionado = \@gestionado,\s*\n\s*Gestionado_el = GETDATE\(\),\s*\n\s*Estado_Proceso = 'CERRADO'\s*\n\s*WHERE ID_Cancelados = \@id/,
    `UPDATE [dbo].[GAC_APP_TB_CANCELACIONES] 
                SET 
                    Cancelacion_Correcta = @cancelacion_correcta,
                    Motivo_Correcto = @motivo_correcto,
                    Observacion_Gestionado = @observacion,
                    Gestionado_por = @gestionado_por,
                    Gestionado = @gestionado,
                    Gestionado_el = GETDATE(),
                    Estado_Proceso = 'CERRADO',
                    Modificado_por = @gestionado_por,
                    Modificado_el = GETDATE()
                WHERE ID_Cancelados = @id`
);

content = content.replace(
    /res\.json\(\{ message: 'Cancelación gestionada correctamente' \}\);/,
    `await pool.request()
                .input('histId', sql.VarChar, Math.random().toString(16).substring(2, 10).toUpperCase())
                .input('id', sql.VarChar, id)
                .input('accion', sql.VarChar, 'Gestión Final')
                .input('obs', sql.VarChar, observacion || 'Se gestionó la solicitud')
                .input('usuario', sql.VarChar, gestionado_por || 'Sistema')
                .query(\`
                    INSERT INTO [dbo].[GAC_APP_TB_HISTORIAL_CANCELACIONES]
                    (ID_Historial_Cancelacion, ID_Cancelados, Accion, Observacion, Creado_el, Creado_por)
                    VALUES (@histId, @id, @accion, @obs, GETDATE(), @usuario)
                \`);
        res.json({ message: 'Cancelación gestionada correctamente' });`
);

// 3. Cancelaciones Asignar
content = content.replace(
    /UPDATE \[dbo\]\.\[GAC_APP_TB_CANCELACIONES\] \s*\n\s*SET \s*\n\s*Asignado_a = \@asignado_a,\s*\n\s*Asignado_por = \@asignado_por,\s*\n\s*Asignado_el = GETDATE\(\),\s*\n\s*Gestionado = 'No',\s*\n\s*Estado_Proceso = 'ASIGNADO'\s*\n\s*WHERE ID_Cancelados = \@id/,
    `UPDATE [dbo].[GAC_APP_TB_CANCELACIONES] 
                SET 
                    Asignado_a = @asignado_a,
                    Asignado_por = @asignado_por,
                    Asignado_el = GETDATE(),
                    Gestionado = 'No',
                    Estado_Proceso = 'ASIGNADO',
                    Modificado_por = @asignado_por,
                    Modificado_el = GETDATE()
                WHERE ID_Cancelados = @id`
);

content = content.replace(
    /res\.json\(\{ message: 'Cancelación asignada' \}\);/,
    `await pool.request()
                .input('histId', sql.VarChar, Math.random().toString(16).substring(2, 10).toUpperCase())
                .input('id', sql.VarChar, id)
                .input('accion', sql.VarChar, 'Asignación')
                .input('obs', sql.VarChar, 'Asignado a: ' + asignado_a)
                .input('usuario', sql.VarChar, asignado_por || 'Sistema')
                .query(\`
                    INSERT INTO [dbo].[GAC_APP_TB_HISTORIAL_CANCELACIONES]
                    (ID_Historial_Cancelacion, ID_Cancelados, Accion, Observacion, Creado_el, Creado_por)
                    VALUES (@histId, @id, @accion, @obs, GETDATE(), @usuario)
                \`);
        res.json({ message: 'Cancelación asignada' });`
);

// CXG/NC UPDATES
// A. Aprobar Solicitud
content = content.replace(
    /Estado_Proceso = \@aprobado\s*\n\s*WHERE ID_Apro_CxG_NC = \@id/,
    `Estado_Proceso = @aprobado, Modificado_por = @usuario, Modificado_el = GETDATE()
                WHERE ID_Apro_CxG_NC = @id`
);

// B. Asignar
content = content.replace(
    /Asignado_el = GETDATE\(\),\s*\n\s*Estado_Proceso = 'ASIGNADO'\s*\n\s*WHERE ID_Apro_CxG_NC = \@id/,
    `Asignado_el = GETDATE(),
                    Estado_Proceso = 'ASIGNADO',
                    Modificado_por = @asignado_por, Modificado_el = GETDATE()
                WHERE ID_Apro_CxG_NC = @id`
);

// C. Gestionar
content = content.replace(
    /Procesado_el = GETDATE\(\),\s*\n\s*Procesado_por = \@procesado_por,\s*\n\s*Estado_Proceso = 'CERRADO'\s*\n\s*WHERE ID_Apro_CxG_NC = \@id/,
    `Procesado_el = GETDATE(),
                    Procesado_por = @procesado_por,
                    Estado_Proceso = 'CERRADO',
                    Modificado_por = @procesado_por, Modificado_el = GETDATE()
                WHERE ID_Apro_CxG_NC = @id`
);

// D. Validar Cliente
content = content.replace(
    /Vali_El = GETDATE\(\),\s*\n\s*Vali_Motivo_Real = \@vali_motivo_real,\s*\n\s*Estado_Proceso = 'CERRADO'\s*\n\s*WHERE ID_Apro_CxG_NC = \@id/,
    `Vali_El = GETDATE(),
                    Vali_Motivo_Real = @vali_motivo_real,
                    Estado_Proceso = 'CERRADO',
                    Modificado_por = @usuario, Modificado_el = GETDATE()
                WHERE ID_Apro_CxG_NC = @id`
);

fs.writeFileSync('server/routes/nc.ts', content);
console.log("Patch applied.");
