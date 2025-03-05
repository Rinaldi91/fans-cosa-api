const TestGlucosaModel = require('../models/testGlucosaModel');
const db = require('../config/db');

module.exports = {

    createTest: async (req, res) => {
        try {
            let { date_time, glucos_value, unit, patient_id, device_name } = req.body;
    
            // Jika patient_id kosong atau null, set ke 0
            if (!patient_id) {
                patient_id = 0;
            }
    
            // Validasi input untuk field wajib selain patient_id
            if (!date_time || !glucos_value || !unit) {
                return res.status(400).send({
                    status: 'error',
                    message: 'Date, glucose value, and unit are required',
                    data: null
                });
            }
    
            // Validasi nilai gula darah
            if (glucos_value <= 0) {
                return res.status(400).send({
                    status: 'error',
                    message: 'Invalid glucose value',
                    data: null
                });
            }
    
            // Validasi unit
            const validUnits = ['mg/dL', 'mmol/L'];
            if (!validUnits.includes(unit)) {
                return res.status(400).send({
                    status: 'error',
                    message: 'Invalid unit. Must be mg/dL or mmol/L',
                    data: null
                });
            }
    
            // Jika patient_id bukan 0, periksa apakah pasien ada di database
            if (patient_id !== 0) {
                const [patientCheck] = await db.query('SELECT id FROM patients WHERE id = ?', [patient_id]);
                if (patientCheck.length === 0) {
                    patient_id = 0;
                }

                // if (patientCheck.length === 0) {
                //     return res.status(404).send({
                //         status: 'error',
                //         message: 'Patient not found',
                //         data: null
                //     });
                // }
            }
    
            // Tambahkan test ke database
            const testId = await TestGlucosaModel.create({
                date_time,
                glucos_value,
                unit,
                patient_id,
                device_name,
            });
    
            if (!testId) {
                throw new Error('Failed to insert glucose test');
            }
    
            // Ambil data test yang baru saja dibuat
            const [newTest] = await db.query(
                'SELECT * FROM glucosa_tests WHERE id = ?',
                [testId]
            );
    
            res.status(201).send({
                status: 'success',
                message: 'Glucose test added successfully',
                data: newTest[0]
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).send({
                    status: 'error',
                    message: 'Duplicate entry',
                    data: null
                });
            }
    
            res.status(500).send({
                status: 'error',
                message: 'Failed to add glucose test',
                data: { error: error.message }
            });
        }
    },
    
    getAllTestPatients: async (req, res) => {
        const { page = 1, limit = 10 } = req.query;

        // Pastikan parameter `page` dan `limit` adalah angka
        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;

        // Hitung offset
        const offset = (pageNumber - 1) * limitNumber;

        try {
            // Dapatkan data pasien dengan limit dan offset
            const glucosaTest = await TestGlucosaModel.getAllWithPagination(limitNumber, offset);

            // Hitung total data pasien
            const totalTestPatients = await TestGlucosaModel.getTotalCount();

            // Hitung total halaman
            const totalPages = Math.ceil(totalTestPatients / limitNumber);

            res.status(200).send({
                status: 'success',
                message: 'Glucose tests retrieved successfully',
                data: {
                    glucosaTest,
                    pagination: {
                        currentPage: pageNumber,
                        totalPages,
                        totalTestPatients,
                        perPage: limitNumber,
                    },
                },
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: 'Failed to retrieve glucose test',
                data: { error: error.message },
            });
        }
    },

    // Dapatkan tes gula darah berdasarkan ID pasien
    getPatientTests: async (req, res) => {
        try {
            const { patient_id } = req.params;
            const limit = parseInt(req.query.limit) || 10;
            const page = parseInt(req.query.page) || 1;
            const offset = (page - 1) * limit;
            try {
                const result = await TestGlucosaModel.getByPatientId(patient_id, limit, offset);
                res.status(200).send({
                    status: 'success',
                    message: 'Glucose tests retrieved successfully',
                    ...result // Spread pagination dan data
                });
            } catch (modelError) {
                // Tangani error spesifik dari model
                return res.status(404).send({
                    status: 'error',
                    message: modelError.message,
                    data: null
                });
            }
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: 'Failed to retrieve glucose tests',
                data: { error: error.message }
            });
        }
    },

    // Dapatkan tes gula darah berdasarkan ID pasien no pagination
    getPatientTestsAll: async (req, res) => {
        try {
            const { patient_id } = req.params;

            try {
                const data = await TestGlucosaModel.getByPatientIdAll(patient_id);

                res.status(200).send({
                    status: 'success',
                    message: 'Glucose tests retrieved successfully',
                    data // Langsung kirimkan semua data
                });
            } catch (modelError) {
                // Tangani error spesifik dari model
                return res.status(404).send({
                    status: 'error',
                    message: modelError.message,
                    data: null
                });
            }
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: 'Failed to retrieve glucose tests',
                data: { error: error.message }
            });
        }
    },  


    // Update tes gula darah
    updateTest: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Validasi input
            if (!updateData.date_time || !updateData.glucos_value || !updateData.unit) {
                return res.status(400).send({
                    status: 'error',
                    message: 'All fields are required',
                    data: null
                });
            }

            const updated = await TestGlucosaModel.update(id, updateData);

            if (!updated) {
                return res.status(404).send({
                    status: 'error',
                    message: 'Glucose test not found',
                    data: null
                });
            }

            res.status(200).send({
                status: 'success',
                message: 'Glucose test updated successfully',
                data: updateData
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: 'Failed to update glucose test',
                data: { error: error.message }
            });
        }
    },

    // Hapus tes gula darah
    deleteTest: async (req, res) => {
        try {
            const { id } = req.params;

            const deleted = await TestGlucosaModel.delete(id);

            if (!deleted) {
                return res.status(404).send({
                    status: 'error',
                    message: 'Glucose test not found',
                    data: null
                });
            }

            res.status(200).send({
                status: 'success',
                message: 'Glucose test deleted successfully',
                data: null
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: 'Failed to delete glucose test',
                data: { error: error.message }
            });
        }
    },

    syncGlucosaTests: async (req, res) => {
        try {
            const result = await TestGlucosaModel.syncGlucosaTests();
            res.status(200).send(result);
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: error.message,
                data: null
            });
        }
    }    
};

// Tambah tes gula darah baru
    // createTest: async (req, res) => {
    //     try {
    //         const { date_time, glucos_value, unit, patient_id } = req.body;

    //         // Validasi input
    //         if (!date_time || !glucos_value || !unit || !patient_id) {
    //             return res.status(400).send({
    //                 status: 'error',
    //                 message: 'All fields are required',
    //                 data: null
    //             });
    //         }

    //         // Validasi nilai gula darah
    //         if (glucos_value <= 0) {
    //             return res.status(400).send({
    //                 status: 'error',
    //                 message: 'Invalid glucose value',
    //                 data: null
    //             });
    //         }

    //         // Validasi unit
    //         const validUnits = ['mg/dL', 'mmol/L'];
    //         if (!validUnits.includes(unit)) {
    //             return res.status(400).send({
    //                 status: 'error',
    //                 message: 'Invalid unit. Must be mg/dL or mmol/L',
    //                 data: null
    //             });
    //         }

    //         // Tambahkan validasi patient_id
    //         const [patientCheck] = await db.query('SELECT id FROM patients WHERE id = ?', [patient_id]);
    //         if (patientCheck.length === 0) {
    //             return res.status(404).send({
    //                 status: 'error',
    //                 message: 'Patient not found',
    //                 data: null
    //             });
    //         }

    //         // Tambahkan test dan dapatkan ID
    //         const testId = await TestGlucosaModel.create(req.body);

    //         // Ambil data test yang baru saja dibuat
    //         const [newTest] = await db.query(
    //             'SELECT * FROM glucosa_tests WHERE id = ?',
    //             [testId]
    //         );

    //         res.status(201).send({
    //             status: 'success',
    //             message: 'Glucose test added successfully',
    //             data: newTest[0] // Kirim seluruh data test
    //         });
    //     } catch (error) {
    //         // Tangani error unique constraint atau lainnya
    //         if (error.code === 'ER_DUP_ENTRY') {
    //             return res.status(400).send({
    //                 status: 'error',
    //                 message: 'Duplicate entry',
    //                 data: null
    //             });
    //         }

    //         res.status(500).send({
    //             status: 'error',
    //             message: 'Failed to add glucose test',
    //             data: { error: error.message }
    //         });
    //     }
    // },