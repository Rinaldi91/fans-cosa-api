const TestGlucosaModel = require('../models/testGlucosaModel');
const TestGlucosaBridgingModel = require('../models/testGlucoseBridgingModels');
const db = require('../config/db');

module.exports = {
    createTest: async (req, res) => {
        try {
            let { date_time, glucos_value, unit, patient_id, device_name, metode, is_validation } = req.body;

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
            }

            // Tambahkan test ke database
            const testId = await TestGlucosaModel.create({
                date_time,
                glucos_value,
                unit,
                patient_id,
                device_name,
                metode: "Elektrokimia",
                is_validation: 0
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

    //get all glucose tests with pagination
    // getAllTestPatients: async (req, res) => {
    //     const { page = 1, limit = 10, search = '' } = req.query;

    //     // Pastikan parameter `page` dan `limit` adalah angka
    //     const pageNumber = parseInt(page, 10) || 1;
    //     const limitNumber = parseInt(limit, 10) || 10;

    //     // Hitung offset
    //     const offset = (pageNumber - 1) * limitNumber;

    //     try {
    //         // Dapatkan data dengan pencarian
    //         const glucosaTest = await TestGlucosaModel.getAllWithPagination(limitNumber, offset, search);

    //         // Hitung total data dengan pencarian yang sama
    //         const totalTestPatients = await TestGlucosaModel.getTotalCount(search);

    //         // Hitung total halaman
    //         const totalPages = Math.ceil(totalTestPatients / limitNumber);

    //         res.status(200).send({
    //             status: 'success',
    //             message: 'Glucose tests retrieved successfully',
    //             data: {
    //                 glucosaTest,
    //                 pagination: {
    //                     currentPage: pageNumber,
    //                     totalPages,
    //                     totalTestPatients,
    //                     perPage: limitNumber,
    //                 },
    //             },
    //         });
    //     } catch (error) {
    //         res.status(500).send({
    //             status: 'error',
    //             message: 'Failed to retrieve glucose test',
    //             data: { error: error.message },
    //         });
    //     }
    // },
    getAllTestPatients: async (req, res) => {
        const {
            page = 1,
            limit = 10,
            search = '',
            date_time = '',
            start_date = '',
            end_date = '',
            is_validation
        } = req.query;

        // Pastikan parameter `page` dan `limit` adalah angka
        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;

        // Hitung offset
        const offset = (pageNumber - 1) * limitNumber;

        // Buat objek filters untuk parameter pencarian
        const filters = {};

        // Tambahkan filter tanggal jika ada
        if (date_time) {
            filters.date_time = date_time;
        }

        // Tambahkan filter rentang tanggal jika keduanya ada
        if (start_date && end_date) {
            filters.start_date = start_date;
            filters.end_date = end_date;
        }

        // Tambahkan filter is_validation jika ada dan valid
        if (is_validation !== undefined && is_validation !== '') {
            const validationValue = parseInt(is_validation, 10);
            // Cek apakah hasil konversi adalah angka valid (tidak NaN)
            if (!isNaN(validationValue)) {
                filters.is_validation = validationValue;
            }
        }

        try {
            // Dapatkan data dengan pencarian dan filter
            const glucosaTest = await TestGlucosaModel.getAllWithPagination(limitNumber, offset, search, filters);

            // Hitung total data dengan pencarian dan filter yang sama
            const totalTestPatients = await TestGlucosaModel.getTotalCount(search, filters);

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
            console.error("Error in getAllTestPatients:", error);
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
    },

    updateValidation: async (req, res) => {
        try {
            const { id } = req.params;
            const userName = req.user.name; // Mengambil name dari req.user yang diisi oleh middleware

            // Validasi jika ID tidak valid
            if (!id || isNaN(id)) {
                return res.status(400).json({ message: 'ID tidak valid' });
            }

            // Ambil data yang akan dipindahkan
            const testData = await TestGlucosaModel.getTestDataById(id);
            if (!testData) {
                return res.status(404).json({ message: 'Data not found' });
            }

            // Update status validasi dengan menyertakan userName
            const isUpdated = await TestGlucosaModel.IsValidationTest(id, userName);
            if (!isUpdated) {
                return res.status(500).json({ message: 'Failed to update validation status' });
            }

            // Insert data ke tabel glucosa_test dalam database cosa_app_bridging_db
            const newData = {
                id: testData.id,
                date_time: testData.date_time,
                glucos_value: testData.glucos_value,
                unit: testData.unit,
                patient_id: testData.patient_id,
                device_name: testData.device_name,
                metode: testData.metode,
                is_validation: 1, // Menandai bahwa data ini sudah divalidasi
                user_validation: userName // Menambahkan informasi user yang melakukan validasi
            };

            const insertResult = await TestGlucosaBridgingModel.insertGlucosaTest(newData);
            if (!insertResult) {
                return res.status(500).json({ message: 'Failed to insert data into bridging database' });
            }

            // Kembalikan respons yang menyertakan informasi user
            return res.status(200).json({
                message: 'Validation and data migration successful',
                user_validation: userName // Mengirimkan kembali informasi user untuk digunakan di frontend
            });
        } catch (error) {
            console.error('Error updating validation:', error);
            return res.status(500).json({ message: 'An error occurred on the server' });
        }
    },
    // updateValidation: async (req, res) => {
    //     try {
    //         const { id } = req.params;

    //         // Validasi jika ID tidak valid
    //         if (!id || isNaN(id)) {
    //             return res.status(400).json({ message: 'ID tidak valid' });
    //         }

    //         // Ambil data yang akan dipindahkan
    //         const testData = await TestGlucosaModel.getTestDataById(id);

    //         if (!testData) {
    //             return res.status(404).json({ message: 'Data not found' });
    //         }

    //         // Update status validasi
    //         const isUpdated = await TestGlucosaModel.IsValidationTest(id);

    //         if (!isUpdated) {
    //             return res.status(500).json({ message: 'Failed to update validation status' });
    //         }

    //         // Insert data ke tabel glucosa_test dalam database cosa_app_bridging_db
    //         const newData = {
    //             id: testData.id,
    //             date_time: testData.date_time,
    //             glucos_value: testData.glucos_value,
    //             unit: testData.unit,
    //             patient_id: testData.patient_id,
    //             device_name: testData.device_name,
    //             metode: testData.metode,
    //             is_validation: 1 // Menandai bahwa data ini sudah divalidasi
    //         };

    //         const insertResult = await TestGlucosaBridgingModel.insertGlucosaTest(newData);

    //         if (!insertResult) {
    //             return res.status(500).json({ message: 'Failed to insert data into bridging database' });
    //         }

    //         return res.status(200).json({ message: 'Validation and data migration successful' });

    //     } catch (error) {
    //         console.error('Error updating validation:', error);
    //         return res.status(500).json({ message: 'An error occurred on the server' });
    //     }
    // },

    //dashboard
    totalResultIsValidationDone: async (req, res) => {
        try {
            const result = await TestGlucosaModel.getTotalResultIsValidationDone();
            res.status(200).send({
                status: 'success',
                message: 'Glucose tests done successfully',
                data: result
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: error.message,
                data: null
            });
        }
    },

    totalResultIsValidationNotDone: async (req, res) => {
        try {
            const result = await TestGlucosaModel.getTotalResultIsValidationNotDone();
            res.status(200).send({
                status: 'success',
                message: 'Glucose tests not done successfully',
                data: result
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: error.message,
                data: null
            });
        }
    },
    totalResult: async (req, res) => {
        try {
            const result = await TestGlucosaModel.getAllTotalResults();
            res.status(200).send({
                status: 'success',
                message: 'Glucose tests successfully',
                data: result
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: error.message,
                data: null
            });
        }
    },

    totalTestResultsPerMonth: async (req, res) => {
        try {
            // Get year from query parameters, defaulting to current year if not provided
            const year = req.query.year || new Date().getFullYear();

            // Pass the year parameter to the model function
            const result = await TestGlucosaModel.getMonthlyTestResults(year);

            res.status(200).send({
                status: 'success',
                message: 'Monthly glucose tests retrieved successfully',
                data: result
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: error.message,
                data: null
            });
        }
    },

    //buatkan controller untuk mendapatkan jumlah total glucosa test berdasarkan data terbaru dari created_at
    totalTestResults: async (req, res) => {
        try {
            // Panggil model untuk mendapatkan data terbaru
            const result = await TestGlucosaModel.getLatestResult();

            // Kirim respons dengan total dan list data
            res.status(200).send({
                status: 'success',
                message: 'Total glucose tests retrieved successfully',
                data: {
                    total: result.total,
                    dataList: result.dataList
                }
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: error.message,
                data: null
            });
        }
    },

    //buatkan update is_status menjadi 1 pada tabel glucosa_tests
    updateIsStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const result = await TestGlucosaModel.IsStatusTest(id);
            res.status(200).send({
                status: 'success',
                message: 'Is status updated successfully',
                data: result
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: error.message,
                data: null
            });
        }
    },

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

// if (patientCheck.length === 0) {
//     return res.status(404).send({
//         status: 'error',
//         message: 'Patient not found',
//         data: null
//     });
// }